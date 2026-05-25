import math
from dataclasses import dataclass
from statistics import NormalDist
from typing import Any

from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import make_scorer, mean_absolute_error, mean_pinball_loss, root_mean_squared_error
from sklearn.model_selection import GridSearchCV, TimeSeriesSplit
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


# DEFAULT_FEATURE_COLUMNS가 잘 닫히지 않은 경우 아래 형태로 정리
DEFAULT_FEATURE_COLUMNS = [
    "item_id",
    "temp_c",
    "rain_mm",
    "is_holiday",
    "promo",
    "event_score_100",
    "is_event",
    "major_event_flag",
    "event_score_x_weekend",
    "event_score_x_promo",
    "day_of_week",
    "is_weekend",
    "month",
    "day_of_month",
    "days_to_holiday",
    "days_since_holiday",
    "shop_total_lag_7",
    "trend_28d",
    "lag_1",
    "lag_7",
    "lag_14",
    "lag_28",
    "roll_mean_7",
    "roll_std_7",
    "roll_mean_14",
    "roll_std_14",
]

@dataclass
class ModelArtifacts:
    models: dict[float, Any]
    feature_columns: list[str]
    raw_df: pd.DataFrame
    feature_df: pd.DataFrame
    as_of_date: pd.Timestamp
    model_type: str


# ----------------------------------------------------------------------
# 1) CSV 기반 음료 실데이터용 유틸
# ----------------------------------------------------------------------

def load_beverage_daily_from_csv(path: str) -> pd.DataFrame:
    """
    sample-DH_CAFE_SALES_DATA-1.csv 에서
    Beverage 행만 골라 일자+item별 수량/매출을 집계.
    결과 컬럼:
      date, item_id, demand_qty, sales_amount
    """
    df = pd.read_csv(path)

    # 날짜
    df["SALES_DE"] = pd.to_datetime(df["SALES_DE"].astype(str), format="%Y%m%d")

    # 음료만 필터
    bev = df[df["LCLAS_CD"] == "Beverage"].copy()

    # 반품 제거
    bev = bev[bev["SALES_CD"] != "반품"]

    # 수량/금액 숫자형
    bev["ORDER_CN"] = bev["ORDER_CN"].astype(float)
    bev["PAYMENT_PRICE"] = bev["PAYMENT_PRICE"].astype(float)

    # 메뉴 식별자: 중분류-소분류
    bev["item_id"] = bev["MLSFC_CD"].astype(str) + "-" + bev["SCLAS_CD"].astype(str)

    daily = (
        bev.groupby(["SALES_DE", "item_id"], as_index=False)
        .agg(
            demand_qty=("ORDER_CN", "sum"),
            sales_amount=("PAYMENT_PRICE", "sum"),
        )
    )
    daily = daily.rename(columns={"SALES_DE": "date"})
    return daily[["date", "item_id", "demand_qty", "sales_amount"]]


def create_beverage_features_from_csv(path: str) -> pd.DataFrame:
    """
    CSV에서 읽은 음료 데이터에 날짜 기반 + 랙/롤링 피처를 생성.
    (실제 모델 학습용 feature_df)
    """
    base = load_beverage_daily_from_csv(path)

    data = base.copy()
    data["date"] = pd.to_datetime(data["date"])
    data = data.sort_values(["item_id", "date"]).reset_index(drop=True)

    # 달력 피처
    data["day_of_week"] = data["date"].dt.dayofweek
    data["is_weekend"] = (data["day_of_week"] >= 5).astype(int)
    data["month"] = data["date"].dt.month
    data["day_of_month"] = data["date"].dt.day

    # 랙
    for lag in [1, 7, 14]:
        data[f"lag_{lag}"] = data.groupby("item_id")["demand_qty"].shift(lag)

    # 롤링 mean/std
    for win in [7, 14]:
        shifted = data.groupby("item_id")["demand_qty"].shift(1)
        data[f"roll_mean_{win}"] = shifted.groupby(data["item_id"]).transform(
            lambda s: s.rolling(win).mean()
        )
        data[f"roll_std_{win}"] = shifted.groupby(data["item_id"]).transform(
            lambda s: s.rolling(win).std()
        )

    # 결측 제거
    data = data.dropna().reset_index(drop=True)
    return data


def train_test_split_by_date(
    feat_df: pd.DataFrame,
    test_days: int = 14,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    date 기준으로 마지막 test_days일을 테스트로 사용.
    item_id 전체에 동일 컷 적용.
    """
    max_date = feat_df["date"].max()
    cutoff = max_date - pd.Timedelta(days=test_days)
    train = feat_df[feat_df["date"] <= cutoff].copy()
    test = feat_df[feat_df["date"] > cutoff].copy()
    return train, test


# ----------------------------------------------------------------------
# 2) 모델 개발용 상세·대량 더미 데이터 (학습/테스트)
# ----------------------------------------------------------------------

def make_rich_dummy_training_data(
    days: int = 720,
    n_items: int = 6,
    seed: int = 123,
) -> pd.DataFrame:
    """
    모델 구조/하이퍼파라미터 개발에 쓰기 위한 고정 스키마 대량 데이터.
    - days: 일수 (기본 2년)
    - n_items: 음료 종류 수
    컬럼: date, item_id, demand_qty, temp_c, rain_mm,
          is_holiday, promo
    """
    rng = np.random.default_rng(seed)
    dates = pd.date_range("2022-01-01", periods=days, freq="D")

    base_items = [
        {"name": "americano", "base": 140, "temp_effect": 0.6, "rain_effect": -0.4, "promo_boost": 20},
        {"name": "latte",     "base": 110, "temp_effect": 0.2, "rain_effect": -0.3, "promo_boost": 16},
        {"name": "ade",       "base": 80,  "temp_effect": 1.3, "rain_effect": -0.7, "promo_boost": 24},
        {"name": "tea",       "base": 60,  "temp_effect": -0.2, "rain_effect": 0.1, "promo_boost": 10},
        {"name": "smoothie",  "base": 70,  "temp_effect": 1.1, "rain_effect": -0.6, "promo_boost": 22},
        {"name": "choco",     "base": 65,  "temp_effect": -0.5, "rain_effect": 0.2, "promo_boost": 12},
    ]
    items = base_items[:n_items]

    rows = []
    for d in dates:
        temp_c = 15 + 12 * np.sin(2 * np.pi * (d.timetuple().tm_yday / 365.25)) + rng.normal(0, 2.0)
        rain_mm = max(0.0, rng.gamma(shape=1.5, scale=3.0) - 2.0)
        is_holiday = int(d.dayofweek >= 5)

        base_promo_prob = 0.12
        if d.month in [6, 7, 8]:
            base_promo_prob = 0.2
        if d.month in [12, 1, 2]:
            base_promo_prob = 0.16

        for item in items:
            promo = int(rng.random() < base_promo_prob)
            event_score_100 = 0.0

            trend = 1 + 0.0008 * (d - dates[0]).days
            weekly = 1 + 0.1 * np.sin(2 * np.pi * d.dayofweek / 7)

            demand = (
                item["base"] * trend * weekly
                + item["temp_effect"] * temp_c
                + item["rain_effect"] * rain_mm
                + item["promo_boost"] * promo
                + 8 * rng.normal()
            )
            demand = max(2, demand)

            rows.append(
                {
                    "date": d,
                    "item_id": item["name"],
                    "demand_qty": int(round(demand)),
                    "temp_c": round(temp_c, 2),
                    "rain_mm": round(rain_mm, 2),
                    "is_holiday": is_holiday,
                    "promo": promo,
                    "event_score_100": event_score_100,
                }
            )

    df = pd.DataFrame(rows)
    return df


def make_rich_dummy_test_data(
    train_days: int = 720,
    test_days: int = 60,
    n_items: int = 6,
    seed: int = 456,
) -> pd.DataFrame:
    """
    학습 더미 기간 바로 다음 구간에 대한 테스트용 더미.
    스키마는 make_rich_dummy_training_data와 동일.
    """
    rng = np.random.default_rng(seed)
    start_date = pd.Timestamp("2022-01-01") + pd.Timedelta(days=train_days)
    dates = pd.date_range(start_date, periods=test_days, freq="D")

    base_items = [
        {"name": "americano", "base": 140, "temp_effect": 0.6, "rain_effect": -0.4, "promo_boost": 20},
        {"name": "latte",     "base": 110, "temp_effect": 0.2, "rain_effect": -0.3, "promo_boost": 16},
        {"name": "ade",       "base": 80,  "temp_effect": 1.3, "rain_effect": -0.7, "promo_boost": 24},
        {"name": "tea",       "base": 60,  "temp_effect": -0.2, "rain_effect": 0.1, "promo_boost": 10},
        {"name": "smoothie",  "base": 70,  "temp_effect": 1.1, "rain_effect": -0.6, "promo_boost": 22},
        {"name": "choco",     "base": 65,  "temp_effect": -0.5, "rain_effect": 0.2, "promo_boost": 12},
    ]
    items = base_items[:n_items]

    rows = []
    for d in dates:
        temp_c = 15 + 12 * np.sin(2 * np.pi * (d.timetuple().tm_yday / 365.25)) + rng.normal(0, 2.0)
        rain_mm = max(0.0, rng.gamma(shape=1.5, scale=3.0) - 2.0)
        is_holiday = int(d.dayofweek >= 5)

        base_promo_prob = 0.12
        if d.month in [6, 7, 8]:
            base_promo_prob = 0.2
        if d.month in [12, 1, 2]:
            base_promo_prob = 0.16

        for item in items:
            promo = int(rng.random() < base_promo_prob)

            trend = 1 + 0.0008 * (d - dates[0]).days
            weekly = 1 + 0.1 * np.sin(2 * np.pi * d.dayofweek / 7)

            demand = (
                item["base"] * trend * weekly
                + item["temp_effect"] * temp_c
                + item["rain_effect"] * rain_mm
                + item["promo_boost"] * promo
                + 8 * rng.normal()
            )
            demand = max(2, demand)

            rows.append(
                {
                    "date": d,
                    "item_id": item["name"],
                    "demand_qty": int(round(demand)),
                    "temp_c": round(temp_c, 2),
                    "rain_mm": round(rain_mm, 2),
                    "is_holiday": is_holiday,
                    "promo": promo,
                }
            )

    return pd.DataFrame(rows)


# ----------------------------------------------------------------------
# 3) 기존 feature 생성 및 모델/예측/재고 로직 (원래 코드 유지)
# ----------------------------------------------------------------------

def create_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    원천 판매 데이터에 달력, 행사, 휴일 인접도, 매장 전체 추세, 랙, 롤링 통계를 생성한다.

    event_score_100은 행사 자체의 원천 점수이며,
    is_event / major_event_flag / event_score_x_weekend / event_score_x_promo 는
    모델 반응력을 높이기 위한 파생 피처다.
    """
    required = {
        "date",
        "item_id",
        "demand_qty",
        "temp_c",
        "rain_mm",
        "is_holiday",
        "promo",
    }

    missing = required.difference(df.columns)
    if missing:
        raise ValueError(f"Missing required columns: {sorted(missing)}")

    data = df.copy()
    data["date"] = pd.to_datetime(data["date"])
    data = data.sort_values(["item_id", "date"]).reset_index(drop=True)

    # 기본 달력 피처
    data["day_of_week"] = data["date"].dt.dayofweek
    data["is_weekend"] = (data["day_of_week"] >= 5).astype(int)
    data["month"] = data["date"].dt.month
    data["day_of_month"] = data["date"].dt.day

    # 행사 원천 점수가 없는 데이터셋도 동일한 파이프라인을 타도록 0으로 보강
    if "event_score_100" not in data.columns:
        data["event_score_100"] = 0.0

    data["event_score_100"] = pd.to_numeric(
        data["event_score_100"], errors="coerce"
    ).fillna(0.0)

    # 행사 여부 / 대형 행사 여부 / 주말 및 프로모션과의 교호효과
    data["is_event"] = (data["event_score_100"] > 0).astype(int)
    data["major_event_flag"] = (data["event_score_100"] >= 70).astype(int)
    data["event_score_x_weekend"] = data["event_score_100"] * data["is_weekend"]
    data["event_score_x_promo"] = data["event_score_100"] * data["promo"]

    # 휴일 전후 특수 수요를 포착하기 위한 거리형 피처
    holiday_dates = data[data["is_holiday"] == 1]["date"].unique()
    if len(holiday_dates) > 0:
        data["days_to_holiday"] = data["date"].apply(
            lambda x: min([max(0, (h - x).days) for h in holiday_dates if x <= h] or [999])
        )
        data["days_since_holiday"] = data["date"].apply(
            lambda x: min([max(0, (x - h).days) for h in holiday_dates if x >= h] or [999])
        )
    else:
        data["days_to_holiday"] = 999
        data["days_since_holiday"] = 999

    # 동일 매장 전체 수요의 7일 전 흐름
    shop_daily_total = data.groupby("date")["demand_qty"].sum().reset_index()
    shop_daily_total["shop_total_lag_7"] = shop_daily_total["demand_qty"].shift(7)
    data = data.merge(shop_daily_total[["date", "shop_total_lag_7"]], on="date", how="left")

    # 품목별 시차 피처
    for lag in [1, 7, 14, 28]:
        data[f"lag_{lag}"] = data.groupby("item_id")["demand_qty"].shift(lag)

    # 품목별 롤링 통계
    shifted = data.groupby("item_id")["demand_qty"].shift(1)
    for win in [7, 14]:
        data[f"roll_mean_{win}"] = shifted.groupby(data["item_id"]).transform(
            lambda s: s.rolling(win).mean()
        )
        data[f"roll_std_{win}"] = shifted.groupby(data["item_id"]).transform(
            lambda s: s.rolling(win).std()
        )

    # 중장기 추세선
    shifted_1 = data.groupby("item_id")["demand_qty"].shift(1)
    data["trend_28d"] = shifted_1.groupby(data["item_id"]).transform(
        lambda s: s.rolling(28).mean()
    )

    return data.dropna().reset_index(drop=True)


def create_features_short_history(df: pd.DataFrame) -> pd.DataFrame:
    """히스토리가 짧은 경우에도 피처 생성이 가능하도록 NaN을 완화한 버전.

    - lag/rolling/trend 창은 그대로 계산하되, 초반 NaN을 0 또는 과거 기반 평균으로 채운다.
    - 정확도는 떨어질 수 있으므로 allow_short_history=True일 때만 사용 권장.
    """
    data = df.copy()

    required = {
        "date",
        "item_id",
        "demand_qty",
        "temp_c",
        "rain_mm",
        "is_holiday",
        "promo",
    }

    missing = required.difference(data.columns)
    if missing:
        raise ValueError(f"Missing required columns: {sorted(missing)}")

    data["date"] = pd.to_datetime(data["date"])
    data = data.sort_values(["item_id", "date"]).reset_index(drop=True)

    # 기본 달력 피처
    data["day_of_week"] = data["date"].dt.dayofweek
    data["is_weekend"] = (data["day_of_week"] >= 5).astype(int)
    data["month"] = data["date"].dt.month
    data["day_of_month"] = data["date"].dt.day

    if "event_score_100" not in data.columns:
        data["event_score_100"] = 0.0

    data["event_score_100"] = pd.to_numeric(data["event_score_100"], errors="coerce").fillna(0.0)
    data["is_event"] = (data["event_score_100"] > 0).astype(int)
    data["major_event_flag"] = (data["event_score_100"] >= 70).astype(int)
    data["event_score_x_weekend"] = data["event_score_100"] * data["is_weekend"]
    data["event_score_x_promo"] = data["event_score_100"] * data["promo"]

    # 휴일 전후 거리형 피처
    holiday_dates = data[data["is_holiday"] == 1]["date"].unique()
    if len(holiday_dates) > 0:
        data["days_to_holiday"] = data["date"].apply(
            lambda x: min([max(0, (h - x).days) for h in holiday_dates if x <= h] or [999])
        )
        data["days_since_holiday"] = data["date"].apply(
            lambda x: min([max(0, (x - h).days) for h in holiday_dates if x >= h] or [999])
        )
    else:
        data["days_to_holiday"] = 999
        data["days_since_holiday"] = 999

    # 매장 전체 수요 lag (짧은 히스토리면 shift(7)이 비므로 shift(1)로 보완)
    shop_daily_total = data.groupby("date")["demand_qty"].sum().reset_index()
    shop_daily_total["shop_total_lag_1"] = shop_daily_total["demand_qty"].shift(1)
    shop_daily_total["shop_total_lag_7"] = shop_daily_total["demand_qty"].shift(7)
    shop_daily_total["shop_total_lag_7"] = shop_daily_total["shop_total_lag_7"].fillna(shop_daily_total["shop_total_lag_1"]).fillna(0.0)
    data = data.merge(shop_daily_total[["date", "shop_total_lag_7"]], on="date", how="left")

    # lag
    for lag in [1, 7, 14, 28]:
        data[f"lag_{lag}"] = data.groupby("item_id")["demand_qty"].shift(lag)

    # rolling
    shifted = data.groupby("item_id")["demand_qty"].shift(1)
    for win in [7, 14]:
        data[f"roll_mean_{win}"] = shifted.groupby(data["item_id"]).transform(
            lambda s: s.rolling(win, min_periods=1).mean()
        )
        data[f"roll_std_{win}"] = shifted.groupby(data["item_id"]).transform(
            lambda s: s.rolling(win, min_periods=2).std()
        )

    shifted_1 = data.groupby("item_id")["demand_qty"].shift(1)
    data["trend_28d"] = shifted_1.groupby(data["item_id"]).transform(
        lambda s: s.rolling(28, min_periods=1).mean()
    )

    # NaN 채우기(과거 기반 expanding mean -> 0)
    exp_mean = (
        data.groupby("item_id")["demand_qty"]
        .transform(lambda s: s.shift(1).expanding(min_periods=1).mean())
        .astype(float)
    )

    fill_zero_cols = [
        "roll_std_7",
        "roll_std_14",
    ]
    for c in fill_zero_cols:
        if c in data.columns:
            data[c] = data[c].fillna(0.0)

    fill_mean_cols = [
        "lag_1",
        "lag_7",
        "lag_14",
        "lag_28",
        "roll_mean_7",
        "roll_mean_14",
        "trend_28d",
        "shop_total_lag_7",
    ]
    for c in fill_mean_cols:
        if c in data.columns:
            data[c] = data[c].fillna(exp_mean).fillna(0.0)

    return data.reset_index(drop=True)

def _to_numeric_series(series: pd.Series) -> pd.Series:
    return pd.to_numeric(
        series.astype(str).str.replace(",", "", regex=False).str.strip(),
        errors="coerce",
    )


def load_beverage_daily_demand(path: str | Path) -> pd.DataFrame:
    path = Path(path)

    try:
        df = pd.read_csv(path)
    except Exception:
        df = pd.read_csv(path, sep=None, engine="python")

    # case 1: already normalized csv
    normalized = {str(c).strip().lower(): c for c in df.columns}
    if {"date", "item_id", "demand_qty"}.issubset(normalized):
        out = df.rename(
            columns={
                normalized["date"]: "date",
                normalized["item_id"]: "item_id",
                normalized["demand_qty"]: "demand_qty",
                **(
                    {normalized["sales_amount"]: "sales_amount"}
                    if "sales_amount" in normalized else {}
                ),
            }
        ).copy()

        out["date"] = pd.to_datetime(out["date"], errors="coerce")
        out["item_id"] = out["item_id"].astype(str).str.strip()
        out["demand_qty"] = pd.to_numeric(out["demand_qty"], errors="coerce")
        if "sales_amount" not in out.columns:
            out["sales_amount"] = np.nan

        out = out.dropna(subset=["date", "item_id", "demand_qty"]).copy()
        out["demand_qty"] = out["demand_qty"].astype(float)
        return out[["date", "item_id", "demand_qty", "sales_amount"]]

    # case 2: raw POS csv
    work = df.copy()
    work.columns = [str(c).strip().upper() for c in work.columns]

    required = {"SALES_DE", "LCLAS_CD", "ORDER_CN"}
    missing = required.difference(work.columns)
    if missing:
        raise ValueError(f"Unsupported CSV schema. Missing columns: {sorted(missing)}")

    bev = work[work["LCLAS_CD"].astype(str).str.strip().str.upper() == "BEVERAGE"].copy()
    if bev.empty:
        raise ValueError("No BEVERAGE rows found in csv")

    # 반품 제거(가능한 경우)
    if "SALES_CD" in bev.columns:
        sales_cd = bev["SALES_CD"].astype(str).str.strip()
        bev = bev[~sales_cd.str.contains("반품", na=False)].copy()

    bev["SALES_DE"] = pd.to_datetime(
        bev["SALES_DE"].astype(str).str[:8],
        format="%Y%m%d",
        errors="coerce",
    )

    # 수량 컬럼 추론
    # - 일부 POS export에서는 ORDER_CN이 '일반/세트' 같은 문자열일 수 있음
    # - 이런 경우 실제 수량은 SLE_CO에 들어있는 경우가 많음
    order_cn_num = _to_numeric_series(bev["ORDER_CN"]) if "ORDER_CN" in bev.columns else pd.Series([np.nan] * len(bev))
    if int(order_cn_num.notna().sum()) == 0 and "SLE_CO" in bev.columns:
        qty = _to_numeric_series(bev["SLE_CO"])
    else:
        qty = order_cn_num

    bev["_QTY"] = qty

    if "PAYMENT_PRICE" in bev.columns:
        bev["PAYMENT_PRICE"] = _to_numeric_series(bev["PAYMENT_PRICE"])
    else:
        bev["PAYMENT_PRICE"] = np.nan

    if "TITLE" in bev.columns:
        item_id = bev["TITLE"].astype(str).str.strip()
    elif {"MLSFC_CD", "SCLAS_CD"}.issubset(bev.columns):
        item_id = (
            bev["MLSFC_CD"].astype(str).str.strip()
            + "-"
            + bev["SCLAS_CD"].astype(str).str.strip()
        )
    elif "SALES_CD" in bev.columns:
        item_id = bev["SALES_CD"].astype(str).str.strip()
    else:
        raise ValueError("Cannot infer item_id from csv")

    bev["item_id"] = item_id.replace({"": np.nan, "nan": np.nan, "None": np.nan})

    daily = (
        bev.dropna(subset=["SALES_DE", "item_id", "_QTY"])
        .groupby(["SALES_DE", "item_id"], as_index=False)
        .agg(
            demand_qty=("_QTY", "sum"),
            sales_amount=("PAYMENT_PRICE", "sum"),
        )
        .rename(columns={"SALES_DE": "date"})
    )

    daily["demand_qty"] = daily["demand_qty"].astype(float)
    return daily[["date", "item_id", "demand_qty", "sales_amount"]]


def enrich_real_daily_data(daily_df: pd.DataFrame) -> pd.DataFrame:
    """
    실데이터 일별 판매 데이터에 모델 입력용 기본 외생변수와 운영 메타를 보강한다.

    실운영 CSV에는 날씨, 행사, 프로모션, 리드타임 같은 컬럼이 없을 수 있으므로
    학습/예측 파이프라인이 동일한 스키마로 동작하도록 기본값을 채운다.
    행사 관련 파생변수는 여기서 계산하지 않고, create_features()에서 일괄 생성한다.
    """
    data = daily_df.copy()
    data["date"] = pd.to_datetime(data["date"])
    data = data.sort_values(["item_id", "date"]).reset_index(drop=True)

    # 실데이터 CSV에는 외생변수가 없을 수 있으므로 기본값으로 스키마를 보강한다.
    data["temp_c"] = 0.0
    data["rain_mm"] = 0.0
    data["is_holiday"] = (data["date"].dt.dayofweek >= 5).astype(int)
    data["promo"] = 0

    # 행사 점수의 원천값만 0으로 채운다.
    # is_event, major_event_flag, interaction 항은 create_features()에서 자동 생성된다.
    data["event_score_100"] = 0.0
    data["is_event"] = 0
    data["major_event_flag"] = 0
    data["event_score_x_weekend"] = 0.0
    data["event_score_x_promo"] = 0.0

    # 운영 제약 조건 기본값
    data["lead_time_days"] = 2
    data["review_period_days"] = 2
    data["moq"] = 5
    data["unit_margin"] = 1500
    data["unit_holding_cost"] = 180

    # 원가/도매가(단가). 실운영에서는 DB 상품 마스터에서 join 권장.
    # 여기서는 스키마 정합을 위해 기본값 0으로 둔다.
    data["unit_cost"] = 0.0

    recent = (
        data.sort_values(["item_id", "date"])
        .groupby("item_id")["demand_qty"]
        .rolling(3)
        .mean()
        .reset_index(level=0, drop=True)
    )

    data["current_inventory"] = (
        recent.fillna(data["demand_qty"]).mul(0.8).clip(lower=0).round().astype(int)
    )
    return data


def verify_prepared_dataset(
    feature_df: pd.DataFrame,
    feature_cols: list[str] | None = None,
    timesteps: int = 14,
) -> dict:
    feature_cols = feature_cols or DEFAULT_FEATURE_COLUMNS
    issues = []

    if feature_df.empty:
        issues.append(
            "feature_df is empty (likely insufficient history for lag/rolling/trend features; need >= 29 days per item)"
        )

    missing_cols = [c for c in feature_cols if c not in feature_df.columns]
    if missing_cols:
        issues.append(f"missing feature columns: {missing_cols}")

    duplicates = 0
    min_item_days = 0
    item_count = 0

    if {"date", "item_id"}.issubset(feature_df.columns) and not feature_df.empty:
        duplicates = int(feature_df.duplicated(["date", "item_id"]).sum())
        item_count = int(feature_df["item_id"].nunique())
        days_per_item = feature_df.groupby("item_id")["date"].nunique()
        min_item_days = int(days_per_item.min()) if not days_per_item.empty else 0
        if min_item_days < max(timesteps + 1, 21):
            issues.append(f"insufficient history per item: min_item_days={min_item_days}")

    if "demand_qty" in feature_df.columns and feature_df["demand_qty"].isna().any():
        issues.append("NaN in demand_qty")

    return {
        "ok": len(issues) == 0,
        "rows": int(len(feature_df)),
        "items": item_count,
        "duplicates": duplicates,
        "min_item_days": min_item_days,
        "issues": issues,
    }


def find_candidate_csv_files(
    preferred_path: str | None = None,
    search_root: str | Path = ".",
) -> list[Path]:
    candidates: list[Path] = []

    if preferred_path:
        p = Path(preferred_path)
        if p.exists() and p.suffix.lower() == ".csv":
            candidates.append(p)

    root = Path(search_root)
    patterns = [
        "*.csv",
        "data/*.csv",
        "dataset/*.csv",
        "datasets/*.csv",
        "input/*.csv",
        "inputs/*.csv",
    ]

    for pattern in patterns:
        candidates.extend(root.glob(pattern))

    uniq = []
    seen = set()
    for p in candidates:
        rp = str(p.resolve())
        if rp not in seen:
            seen.add(rp)
            uniq.append(p)

    def rank(p: Path):
        name = p.name.lower()
        is_sample = 1 if ("sample" in name or "demo" in name) else 0
        return (is_sample, -p.stat().st_mtime)

    return sorted(uniq, key=rank)


def auto_prepare_dataset(
    preferred_csv: str | None = None,
    auto_search_csv: bool = True,
    synthetic_days: int = 460,
    timesteps: int = 14,
    verbose: bool = True,
    allow_short_history: bool = False,
) -> dict:
    errors = []

    if preferred_csv:
        candidates = find_candidate_csv_files(preferred_path=preferred_csv)
        if not candidates:
            raise FileNotFoundError(f"Selected csv not found: {preferred_csv}")
    elif auto_search_csv:
        candidates = find_candidate_csv_files()
    else:
        candidates = []

    for csv_path in candidates:
        try:
            daily_df = load_beverage_daily_demand(csv_path)
            raw_df = enrich_real_daily_data(daily_df)
            feature_df = (
                create_features_short_history(raw_df)
                if allow_short_history
                else create_features(raw_df)
            )
            report = verify_prepared_dataset(
                feature_df,
                feature_cols=DEFAULT_FEATURE_COLUMNS,
                timesteps=timesteps,
            )

            if report["ok"]:
                if verbose:
                    print(f"[DATA] using real csv: {csv_path}")
                    print(
                        f"[VERIFY] rows={report['rows']} items={report['items']} "
                        f"min_item_days={report['min_item_days']} duplicates={report['duplicates']}"
                    )
                return {
                    "source": "real_csv",
                    "path": str(csv_path),
                    "raw_df": raw_df,
                    "feature_df": feature_df,
                    "feature_columns": DEFAULT_FEATURE_COLUMNS,
                    "report": report,
                }

            # preferred_csv를 명시했고 short history 허용이면, 검증 실패여도 그대로 반환(후속 로직에서 fallback 가능)
            if preferred_csv and allow_short_history:
                if verbose:
                    print(f"[DATA] using preferred csv with short-history mode: {csv_path}")
                    print(f"[VERIFY] issues={report['issues']}")
                return {
                    "source": "real_csv_short",
                    "path": str(csv_path),
                    "raw_df": raw_df,
                    "feature_df": feature_df,
                    "feature_columns": DEFAULT_FEATURE_COLUMNS,
                    "report": report,
                }

            errors.append(f"{csv_path.name}: {report['issues']}")
        except Exception as e:
            errors.append(f"{csv_path.name}: {e}")

    if preferred_csv:
        raise ValueError(f"Selected csv could not be used: {errors}")

    raw_df = make_synthetic_cafe_data(days=synthetic_days)
    feature_df = create_features(raw_df)
    report = verify_prepared_dataset(
        feature_df,
        feature_cols=DEFAULT_FEATURE_COLUMNS,
        timesteps=timesteps,
    )

    if verbose:
        if errors:
            print("[DATA] valid real csv not found, fallback to synthetic")
            for msg in errors:
                print(f"[SKIP] {msg}")
        print("[DATA] using synthetic demo data")
        print(
            f"[VERIFY] rows={report['rows']} items={report['items']} "
            f"min_item_days={report['min_item_days']} duplicates={report['duplicates']}"
        )

    return {
        "source": "synthetic",
        "path": None,
        "raw_df": raw_df,
        "feature_df": feature_df,
        "feature_columns": DEFAULT_FEATURE_COLUMNS,
        "report": report,
    }


def train_quantile_models(
    train_df: pd.DataFrame,
    feature_cols: list[str],
    target_col: str = "demand_qty",
    quantiles: tuple[float, ...] = (0.5, 0.95),
    allow_short_history: bool = False,
) -> dict[float, Pipeline]:
    """
    [트리 모델 (Gradient Boosting Regressor)의 외생변수 반영 방식]
    - 작동 방식 (if-else 분기 조건): GBR 모델 수백 개의 의사결정 나무(Decision Tree)가 연속적으로 학습되는 구조입니다. 외생변수가 모델에 입력되면, 나무들은 각 변수를 기준으로 조건을 쪼개어 갑니다.
      (예시 분기: if rain_mm > 5.0 -> if is_holiday == 1 -> if temp_c > 20)
    - 가중치 반영: 특정 수식으로 곱해지는(선형 가중치) 것이 아니라, 과거 데이터에서 그 조건(비가 오고 온도가 높은 날)에 해당하는 판매량의 평균적인 변화량을 찾아내어 최종 예측값을 조정합니다.
    - 특징: 비가 올 때 따뜻한 음료와 차가운 음료의 반응이 다를 수 있는데(비선형적 상호작용), 트리 모델은 이러한 복잡한 조합 조건을 스스로 찾아내어 반응을 예측합니다.
    """
    categorical_cols = [c for c in feature_cols if c in ["item_id", "month", "day_of_week"]]
    numeric_cols = [c for c in feature_cols if c not in categorical_cols]

    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore"), categorical_cols),
            ("num", "passthrough", numeric_cols),
        ]
    )

    models: dict[float, Pipeline] = {}
    X_train = train_df[feature_cols]
    y_train = train_df[target_col]

    n_samples = int(len(train_df))

    for q in quantiles:
        # short history에서는 CV/GridSearch가 실패할 수 있으므로 완화
        use_grid = True
        n_splits = 3
        if allow_short_history:
            if n_samples < 60:
                use_grid = False
            else:
                n_splits = 2

        tscv = TimeSeriesSplit(n_splits=n_splits)

        base_model = Pipeline(
            steps=[
                ("prep", preprocessor),
                (
                    "gbr",
                    GradientBoostingRegressor(
                        loss="quantile",
                        alpha=q,
                        random_state=42,
                    ),
                ),
            ]
        )

        # [고도화 2] 데이터 맞춤형 하이퍼파라미터 자동 탐색 (Grid Search) + 과적합 튜닝
        # 고정된 의사결정 수(n_estimators)나 깊이(max_depth)를 벗어나, 시계열 검증(tscv)을 통과한 가장 점수가 좋은 모델 구조로 학습
        param_grid = {
            "gbr__n_estimators": [150, 300],
            "gbr__max_depth": [3, 4],
            "gbr__learning_rate": [0.05]
        }

        # 타겟 분위수(q)에 맞춰 오차를 정확히 계산하는 목적함수(neg_pinball_loss) 지정
        scorer = make_scorer(mean_pinball_loss, alpha=q, greater_is_better=False)

        if not use_grid:
            print(f"[SHORT] Fit GBR Quantile q={q} without GridSearchCV (n_samples={n_samples})")
            base_model.fit(X_train, y_train)
            models[q] = base_model
        else:
            grid_search = GridSearchCV(
                estimator=base_model,
                param_grid=param_grid,
                cv=tscv,
                scoring=scorer,
                n_jobs=1,
            )

            print(f"Running GridSearchCV for GBR Quantile q={q}...")
            try:
                grid_search.fit(X_train, y_train)
                print(f"  -> Best params for q={q}: {grid_search.best_params_}")
                models[q] = grid_search.best_estimator_
            except Exception as e:
                if allow_short_history:
                    print(f"[SHORT] GridSearchCV failed for q={q}, fallback to base fit: {e}")
                    base_model.fit(X_train, y_train)
                    models[q] = base_model
                else:
                    raise

    return models


def create_lstm_sequences(df: pd.DataFrame, feature_cols: list[str], timesteps: int = 14):
    """
    [시계열 시퀀스(Time Series Sequence) 생성 함수]
    LSTM 모델이 학습할 수 있도록 2차원 표(행=날짜, 열=피처) 데이터를
    3차원 블록(샘플수 x 과거기간(timesteps) x 피처수) 형태로 변환합니다.
    """
    ref_indices: list[int] = []
    Xs: list[np.ndarray] = []

    # 각 음료(item_id)별로 그룹화하여 날짜순으로 정렬합니다. (다른 음료끼리 시퀀스가 섞이면 안 되기 때문입니다)
    for _, g in df.sort_values(["item_id", "date"]).groupby("item_id"):
        arr = g[feature_cols].to_numpy()
        
        # 슬라이딩 윈도우(Sliding Window) 방식: 
        # i일의 수요를 예측하기 위해, (i - timesteps)일 부터 (i - 1)일까지의 데이터를 잘라내어 시퀀스로 만듭니다.
        for i in range(timesteps, len(arr)):
            seq = arr[i - timesteps : i] # 과거 timesteps일 간의 데이터 묶음
            Xs.append(seq)
            ref_indices.append(g.index[i]) # 예측 대상이 되는 기준일(오늘)의 원본 데이터프레임 인덱스

    if not Xs:
        return np.empty((0, timesteps, len(feature_cols))), []

    # 만들어진 모든 시퀀스 형태의 덩어리들을 모아 NumPy 다차원 배열(3D Tensor)로 결합하여 반환합니다.
    return np.stack(Xs, axis=0), ref_indices


def train_lstm_quantile_models(
    train_df: pd.DataFrame,
    feature_cols: list[str],
    target_col: str = "demand_qty",
    quantiles: tuple[float, ...] = (0.5, 0.95),
    timesteps: int = 14, # 기간 (과거 며칠치를 볼 것인가)
    epochs: int = 5,
    batch_size: int = 64,
) -> dict[float, dict]:
    """
    [시계열 딥러닝 모델 (LSTM)의 외생변수 반영 방식]
    - 작동 방식: 단 하루의 외생변수만 보는 것이 아니라, 설정된 기간(timesteps) 동안의 외생변수 연속적인 흐름을 전부 봅니다. (입력 전 StandardScaler를 통해 정규화됨)
    - 가중치 반영: 신경망 내부의 가중치 행렬과 곱해집니다. LSTM 내부에는 정보를 기억할지 버릴지 결정하는 'Gate'들이 있어,
    예시) '최근 3일 비가 많이 오고 오늘 프로모션을 한다'는 식의 연속적인 패턴 자체를 찾아내어 가중치로 작용합니다.
    - 특징: 어제의 비가 오늘의 수요에 미치는 여파(지연 효과), 기온이 상승/하강하는 추세 등 시간적인 흐름 속에서의 영향을 깊게 학습합니다.
    """
    try:
        from tensorflow import keras
        from tensorflow.keras import layers
        import tensorflow as tf
    except Exception as e:
        raise ImportError("TensorFlow is required for LSTM models. Install with `pip install tensorflow`") from e

    # LSTM은 문자열 데이터를 처리할 수 없으므로, 연속형(숫자형) 피처만 필터링합니다. (문자열인 item_id 등은 제외)
    numeric_feature_cols = [
        c for c in feature_cols
        if c in train_df.columns and pd.api.types.is_numeric_dtype(train_df[c])
    ]
    if not numeric_feature_cols:
        raise ValueError("No numeric features available for LSTM training")

    # 이전에 설명한 시퀀스 생성 함수를 호출하여 3D 텐서(X)와 각 시퀀스별 타겟의 인덱스(ref_idx)를 가져옵니다.
    X, ref_idx = create_lstm_sequences(train_df, numeric_feature_cols, timesteps=timesteps)
    if X.size == 0:
        raise ValueError("Not enough data to build LSTM sequences")

    # ref_idx를 활용하여 모델이 맞추어야 할 정답지(실제 수요량, y)를 추출합니다.
    y = train_df.loc[ref_idx, target_col].to_numpy()

    # n_samples: 만들어진 시퀀스 묶음의 개수, t: timesteps(과거 날짜 수), f: 피처 개수
    n_samples, t, f = X.shape
    
    # [데이터 형변환 & 스케일링] 
    # 신경망은 입력값의 단위/스케일 차이에 민감하므로 (예: 기온은 20 단위, 강수량은 100 단위)
    # 데이터를 평균 0, 표준편차 1 구조로 정규화(StandardScaler) 합니다.
    # 3차원 데이터는 스케일러에 한 번에 넣을 수 없어 2차원으로 쭉 편 다음(reshape), 변환 후 다시 3차원 원래 모양으로 되감습니다.
    scaler = StandardScaler()
    X_reshaped = X.reshape((n_samples * t, f))
    X_scaled = scaler.fit_transform(X_reshaped).reshape((n_samples, t, f))

    models: dict[float, dict] = {}

    # [핀볼 로스 (Pinball Loss) 정의]
    # 단순 평균 수요(점 예측)가 아니라, "상위 95% 수요량(q=0.95)"이나 "중간 수요량(q=0.5)" 등 
    # 특정 분위수(Quantile) 구간을 예측하도록 딥러닝 모델의 오차(Loss)를 계산해주는 특수한 손실 함수입니다.
    def pinball_loss(q):
        def loss(y_true, y_pred):
            e = y_true - y_pred
            return tf.reduce_mean(tf.maximum(q * e, (q - 1) * e))
        return loss

    # 3. LSTM 모델 아키텍처 학습
    for q in quantiles:
        keras.backend.clear_session()
        
        # 3.1. 입력층: (timesteps: 과거 날짜 폭, f: 외생변수 포함 피처 개수) 
        # 즉, 과거 N일간의 외생변수 트렌드 데이터를 단일 입력으로 받습니다.
        inp = keras.Input(shape=(timesteps, f))
        
        # 3.2. 은닉층: LSTM 레이어 2층 구조 
        # 과거부터 현재까지 외생변수가 수요에 미치는 연속적·순차적 영향력을 스스로 기억 및 가중치 업데이트
        x = layers.LSTM(64, return_sequences=True)(inp)
        
        # [고도화 2] 딥러닝 과적합(Overfitting) 방지를 위한 Dropout 레이어 추가
        # 모델이 특정 피처나 과거 패턴에만 너무 의존하여 외우는(Memorize) 것을 막기 위해, 훈련마다 신경망 20%를 강제로 꺼버림.
        x = layers.Dropout(0.2)(x)
        
        x = layers.LSTM(32)(x)
        x = layers.Dropout(0.2)(x)
        
        # 3.3. 출력층: 점예측이 아닌, 설정한 분위수(q)에 해당하는 수요 1개 예측
        out = layers.Dense(1)(x)
        
        model = keras.Model(inp, out)
        model.compile(optimizer=keras.optimizers.Adam(learning_rate=1e-3), loss=pinball_loss(q))

        print(f"Training LSTM quantile q={q} epochs={epochs} samples={n_samples}")
        model.fit(X_scaled, y, epochs=epochs, batch_size=batch_size, verbose=1)

        models[q] = {
            "model": model,
            "scaler": scaler,
            "timesteps": timesteps,
            "feature_cols": numeric_feature_cols,
        }

    return models


def predict_quantiles(
    models: dict[float, Pipeline],
    df: pd.DataFrame,
    feature_cols: list[str],
) -> pd.DataFrame:
    """
    [미래 수요 분위수 예측(Inference) 함수]
    학습된 GBR 또는 LSTM 모델들을 바탕으로 평가용/실서비스용 데이터프레임의 수요 예측값을 산출합니다.
    """
    out = df[["date", "item_id", "demand_qty"]].copy()

    missing = [c for c in feature_cols if c not in df.columns]
    if missing:
        raise ValueError(f"Missing feature columns in df: {missing}")

    X = df[feature_cols]

    for q, model in models.items():
        try:
            # GBR과 같은 scikit-learn Pipeline 객체인 경우 일반적인 다이렉트 예측 수행
            out[f"q{int(q * 100)}"] = model.predict(X)
        except Exception:
            # 에러 발생 시 LSTM 등 커스텀 딕셔너리 모델 객체로 간주
            mdl = model.get("model")
            scaler = model.get("scaler")
            timesteps = model.get("timesteps", 14)
            used_cols = model.get("feature_cols", feature_cols)

            # LSTM용 3차원 시퀀스 형태로 테스트/추론 데이터 변환
            seq_X, ref_idx = create_lstm_sequences(df, used_cols, timesteps=timesteps)
            if seq_X.size == 0:
                out[f"q{int(q * 100)}"] = np.nan
                continue

            # 모델 학습 때 사용한 스케일러(StandardScaler)를 동일하게 적용하여 데이터 정규화
            if scaler is not None:
                n, t, f = seq_X.shape
                seq_X_reshaped = seq_X.reshape((n * t, f))
                seq_X_scaled = scaler.transform(seq_X_reshaped).reshape((n, t, f))
            else:
                seq_X_scaled = seq_X

            # 정규화된 3차원 배열을 이용해 LSTM 추론 수행 후 다시 1차원(스칼라)으로 폄
            preds = mdl.predict(seq_X_scaled).reshape(-1)

            qcol = f"q{int(q * 100)}"
            out[qcol] = np.nan
            out.loc[ref_idx, qcol] = preds

    return out


def evaluate_forecast(pred_df: pd.DataFrame) -> pd.DataFrame:
    """
    [수요 예측 성능 평가 지표 계산]
    - MAE/RMSE: q50(중앙값 예측)을 정답(demand_qty)과 비교하여 전반적인 예측 정확도를 측정합니다.
    - Pinball Loss: q95(물량 부족을 방어하기 위한 다소 넉넉한 상위수요 예측)의 비대칭적 정확도를 평가합니다.
    """
    rows = [
        {
            "metric": "MAE (q50)",
            "value": mean_absolute_error(pred_df["demand_qty"], pred_df["q50"]),
        },
        {
            "metric": "RMSE (q50)",
            "value": root_mean_squared_error(pred_df["demand_qty"], pred_df["q50"]),
        },
        {
            "metric": "Pinball Loss (q95)",
            "value": mean_pinball_loss(pred_df["demand_qty"], pred_df["q95"], alpha=0.95),
        },
    ]
    return pd.DataFrame(rows)


def service_level_from_costs(underage_cost: float, overage_cost: float) -> float:
    """
    [최적 서비스 수준(Service Level) 산출: 뉴즈벤더(Newsvendor) 모델]
    재고 부족 시 기회손실 비용(underage_cost = 마진)과 과잉 재고 유지/폐기 비용(overage_cost)의
    비율을 바탕으로 가장 이익이 극대화되는 수학적 확률(목표 서비스 수준)을 구합니다.
    """
    if underage_cost <= 0:
        raise ValueError("underage_cost must be positive")
    if overage_cost < 0:
        raise ValueError("overage_cost cannot be negative")
    # 예: 마진이 1,500원이고 폐기/유지비용이 180원이면, 품절방어 가치가 커서 서비스수준은 1500/(1500+180) = ~89.2%가 됨
    return underage_cost / (underage_cost + overage_cost)


def order_up_to_level_normal(mu: float, sigma: float, service_level: float) -> float:
    """
    [정규분포 기반 목표 재고(Order-Up-To Level) 산출]
    평균 수요(mu)와 수요 변동성(sigma)을 바탕으로, 원하는 서비스 수준(service_level)을
    달성할 수 있도록 안전재고를 포함한 이상적인 목표 재고량을 정규분포 역함수(Z-score 계산)로 도출합니다.
    """
    sl = float(np.clip(service_level, 1e-4, 0.9999))
    z = NormalDist().inv_cdf(sl) # 설정된 확률분포 면적(분위수)에 해당하는 Z값
    return max(0.0, mu + z * max(0.0, sigma))


def calculate_optimal_order(
    current_inventory: float,
    mean_daily_demand: float,
    p95_daily_demand: float,
    lead_time_days: int,
    review_period_days: int,
    moq: int,
    unit_margin: float,
    unit_holding_cost: float,
) -> dict[str, float | int]:
    """
    [최종 최적 발주량 계산 엔진]
    예측된 일별 수요값과 품목별 운영 제약단위(LT, 리뷰주기, 발주단위 수량 등)를 종합하여
    최종적으로 몇 개를 발주해야 하는지 산출하는 로직입니다.
    """
    # 1. 수요를 방어해야 하는 보호 기간(예: 물건 오는데 걸리는 2일 + 다음 주문까지 2일 = 총 4일)
    protection_days = max(1, int(lead_time_days) + int(review_period_days))
    
    # 2. 해당 보호 기간(전체 기간) 동안 발생할 예상 총 평균 수요
    mu = mean_daily_demand * protection_days

    # 3. 모델이 상위 95% 분위수로 예측한 값을 바탕으로 역산해낸 하루 단위 수요 변동성(표준편차)
    # (통상 정규분포에서 Z=1.645가 상위 95% 구간임)
    sigma_daily = max(0.0, (p95_daily_demand - mean_daily_demand) / 1.645)
    
    # 보호 기간 루트 배수를 적용하여 전체 기간 누적 수요의 표준편차 계산
    sigma = sigma_daily * math.sqrt(protection_days)

    # 4. 재무 정보를 통해 경제적 최적 서비스수준 도출 및 목표 재고량 계산
    service_level = service_level_from_costs(unit_margin, unit_holding_cost)
    target_stock = order_up_to_level_normal(mu, sigma, service_level)

    # 5. (목표 재고 - 현재고)로 순 발주 필요 수량을 계산한 뒤 최소발주수량(MOQ)에 맞춰 올림
    raw_order_qty = max(0.0, target_stock - current_inventory)
    final_qty = 0 if raw_order_qty <= 0 else int(math.ceil(raw_order_qty / moq) * moq)

    return {
        "protection_days": protection_days,
        "service_level": service_level,
        "target_stock": round(target_stock, 2),
        "recommended_order_qty": final_qty,
    }

def score_event_100(
    expected_visitors: int,
    distance_m: float,
    on_main_flow: bool,
    overlap_ratio: float,
    customer_fit: float,
    dwell_hours: float,
    public_event: bool = True,
) -> int:
    """
    행사장 전체 예상 방문객 수를 그대로 쓰지 않고,
    실제 매장 유입 가능성으로 보정한 0~100점 행사 영향 점수를 계산한다.

    Parameters
    ----------
    expected_visitors : int
        행사장 전체 예상 방문객 수.
    distance_m : float
        매장과 행사장 간 거리(미터).
    on_main_flow : bool
        행사장에서 매장으로 이어지는 주동선 여부.
    overlap_ratio : float
        행사 시간과 매장 피크타임 겹침 비율(0~1).
    customer_fit : float
        행사 방문객과 매장 핵심 고객층 적합도(0~1).
    dwell_hours : float
        행사 평균 체류시간(시간).
    public_event : bool, default True
        일반 대중 유입형 공개 행사 여부.

    Returns
    -------
    int
        0~100 범위의 최종 행사 영향 점수.
    """
    if not public_event:
        return 0

    if expected_visitors < 100:
        s_size = 0
    elif expected_visitors < 300:
        s_size = 5
    elif expected_visitors < 700:
        s_size = 10
    elif expected_visitors < 1500:
        s_size = 15
    elif expected_visitors < 3000:
        s_size = 20
    else:
        s_size = 25

    if distance_m <= 100:
        s_dist = 25
    elif distance_m <= 300:
        s_dist = 20
    elif distance_m <= 500:
        s_dist = 15
    elif distance_m <= 1000:
        s_dist = 10
    elif distance_m <= 2000:
        s_dist = 5
    else:
        s_dist = 0

    if on_main_flow:
        s_dist = min(25, s_dist + 5)

    overlap_ratio = float(np.clip(overlap_ratio, 0.0, 1.0))
    if overlap_ratio >= 0.7:
        s_time = 20
    elif overlap_ratio >= 0.4:
        s_time = 15
    elif overlap_ratio >= 0.2:
        s_time = 10
    elif overlap_ratio > 0:
        s_time = 5
    else:
        s_time = 0

    customer_fit = float(np.clip(customer_fit, 0.0, 1.0))
    s_fit = round(customer_fit * 20)

    if dwell_hours >= 4:
        s_dwell = 10
    elif dwell_hours >= 2:
        s_dwell = 7
    elif dwell_hours >= 1:
        s_dwell = 4
    else:
        s_dwell = 1

    return int(min(100, s_size + s_dist + s_time + s_fit + s_dwell))


def make_synthetic_cafe_data(days: int = 460, seed: int = 42) -> pd.DataFrame:
    """
    카페 수요 예측 데모용 synthetic 데이터를 생성한다.

    날짜 단위로 날씨/행사 조건을 먼저 만들고,
    같은 날짜의 모든 메뉴가 동일한 행사 영향 점수를 공유하도록 구성한다.
    """
    rng = np.random.default_rng(seed)
    dates = pd.date_range("2024-01-01", periods=days, freq="D")

    items = [
        {"item_id": "americano", "base": 120, "temp_effect": 0.8, "rain_effect": -0.6, "promo_boost": 16, "unit_cost": 900},
        {"item_id": "latte", "base": 95, "temp_effect": 0.3, "rain_effect": -0.4, "promo_boost": 12, "unit_cost": 1100},
        {"item_id": "ade", "base": 70, "temp_effect": 1.2, "rain_effect": -0.8, "promo_boost": 18, "unit_cost": 1200},
        {"item_id": "tea", "base": 55, "temp_effect": -0.4, "rain_effect": 0.1, "promo_boost": 9, "unit_cost": 800},
    ]

    rows = []
    for d in dates:
        temp_c = 14 + 11 * np.sin(2 * np.pi * (d.timetuple().tm_yday / 365.25)) + rng.normal(0, 1.8)
        rain_mm = max(0, rng.gamma(shape=1.3, scale=2.0) - 1.8)
        is_holiday = int(d.dayofweek >= 5)

        # 날짜 단위 행사 생성: 같은 날짜의 모든 메뉴가 동일 행사 영향을 공유
        if rng.random() < 0.12:
            expected_visitors = int(rng.integers(200, 4000))
            distance_m = float(rng.integers(50, 1500))
            on_main_flow = bool(rng.random() < 0.5)
            overlap_ratio = float(rng.uniform(0.0, 1.0))
            customer_fit = float(rng.uniform(0.2, 1.0))
            dwell_hours = float(rng.uniform(1.0, 6.0))

            event_score_100 = score_event_100(
                expected_visitors=expected_visitors,
                distance_m=distance_m,
                on_main_flow=on_main_flow,
                overlap_ratio=overlap_ratio,
                customer_fit=customer_fit,
                dwell_hours=dwell_hours,
                public_event=True,
            )
        else:
            event_score_100 = 0

        for item in items:
            promo = int(rng.random() < 0.14)
            trend = 1 + 0.0007 * (d - dates[0]).days
            seasonality = 1 + 0.08 * np.sin(2 * np.pi * d.dayofweek / 7)

            # 행사 점수는 0~100 범위이므로, 수요 증가량으로 직접 쓰지 않고 축소 계수로 변환한다.
            event_boost = 0.35 * event_score_100

            demand = (
                item["base"] * trend * seasonality
                + item["temp_effect"] * temp_c
                + item["rain_effect"] * rain_mm
                + item["promo_boost"] * promo
                + event_boost
                + rng.normal(0, 6)
            )
            demand = max(3, demand)

            rows.append(
                {
                    "date": d,
                    "item_id": item["item_id"],
                    "demand_qty": int(round(demand)),
                    "temp_c": round(temp_c, 2),
                    "rain_mm": round(rain_mm, 2),
                    "is_holiday": is_holiday,
                    "promo": promo,
                    "event_score_100": event_score_100,
                    "unit_cost": float(item.get("unit_cost", 0.0)),
                    "lead_time_days": 2 if item["item_id"] in ["americano", "latte"] else 3,
                    "review_period_days": 2,
                    "moq": 10 if item["item_id"] in ["americano", "latte"] else 5,
                    "unit_margin": 1800 if item["item_id"] in ["ade", "latte"] else 1400,
                    "unit_holding_cost": 220 if item["item_id"] == "tea" else 180,
                }
            )

    data = pd.DataFrame(rows)
    rolling = (
        data.sort_values(["item_id", "date"])
        .groupby("item_id")["demand_qty"]
        .rolling(3)
        .mean()
        .reset_index(level=0, drop=True)
    )
    data["recent_3d_mean"] = rolling
    data["current_inventory"] = (data["recent_3d_mean"] * rng.uniform(0.6, 0.95)).fillna(50).round()
    data["current_inventory"] = data["current_inventory"].astype(int)
    return data.drop(columns=["recent_3d_mean"])


# ----------------------------------------------------------------------
# 4) 출력 확장(7/30일 예측 배열, 발주등급, 예상금액, FEFO 폐기위험)
#    - 제안서 tip/MODEL_CHANGES_PROPOSAL.md 기반
# ----------------------------------------------------------------------


def compute_order_priority(
    current_inventory: float,
    target_stock: float,
    *,
    must_threshold: float = 0.30,
    recommend_threshold: float = 0.70,
) -> str:
    if float(target_stock) <= 0:
        return "여유"

    ratio = float(current_inventory) / float(target_stock)
    if ratio < must_threshold:
        return "필수"
    if ratio < recommend_threshold:
        return "권장"
    return "여유"


def compute_expected_total_cost(recommended_order_qty: int, unit_cost: float) -> float:
    return float(recommended_order_qty) * float(unit_cost)


@dataclass(frozen=True)
class InventoryLot:
    qty: int
    days_to_expire: int


def simulate_fefo_expected_waste(
    lots: list[InventoryLot],
    daily_demands: list[float | int],
) -> dict[str, int]:
    working = [InventoryLot(int(l.qty), int(l.days_to_expire)) for l in lots]
    working = sorted(working, key=lambda x: x.days_to_expire)

    waste_qty = 0
    fulfilled_qty = 0
    lost_qty = 0

    qtys = [l.qty for l in working]
    expires = [l.days_to_expire for l in working]

    for day_idx, demand in enumerate(daily_demands):
        demand_int = int(max(0, round(float(demand))))

        # 만료 처리
        for i in range(len(qtys)):
            if qtys[i] <= 0:
                continue
            if (expires[i] - day_idx) <= 0:
                waste_qty += qtys[i]
                qtys[i] = 0

        # FEFO 차감
        remaining = demand_int
        for i in range(len(qtys)):
            if remaining <= 0:
                break
            if qtys[i] <= 0:
                continue
            take = min(qtys[i], remaining)
            qtys[i] -= take
            remaining -= take
            fulfilled_qty += take

        if remaining > 0:
            lost_qty += remaining

    return {
        "expected_waste_qty": int(waste_qty),
        "expected_sales_fulfilled_qty": int(fulfilled_qty),
        "expected_lost_sales_qty": int(lost_qty),
    }


def _safe_std(values: list[float]) -> float:
    if len(values) <= 1:
        return 0.0
    return float(np.std(values, ddof=1))


def _mean(values: list[float]) -> float:
    return float(np.mean(values)) if values else 0.0


def _get_lag(history: list[float], lag: int) -> float:
    if not history:
        return 0.0
    if lag <= 0 or len(history) < lag:
        return float(history[-1])
    return float(history[-lag])


def _calc_features_for_next_day(
    *,
    feature_columns: list[str],
    item_id: str,
    next_date: pd.Timestamp,
    history_demands: list[float],
    last_known_row: pd.Series,
    holiday_dates: set[pd.Timestamp] | None,
    future_exogenous: dict[str, Any] | None = None,
) -> pd.DataFrame:
    next_date = pd.to_datetime(next_date)

    day_of_week = int(next_date.dayofweek)
    is_weekend = int(day_of_week >= 5)
    month = int(next_date.month)
    day_of_month = int(next_date.day)

    if holiday_dates:
        holiday_norm = {pd.to_datetime(h).normalize() for h in holiday_dates}
        is_holiday = int(next_date.normalize() in holiday_norm)
        to_h = [
            max(0, (h.normalize() - next_date.normalize()).days)
            for h in holiday_norm
            if next_date.normalize() <= h.normalize()
        ]
        since_h = [
            max(0, (next_date.normalize() - h.normalize()).days)
            for h in holiday_norm
            if next_date.normalize() >= h.normalize()
        ]
        days_to_holiday = int(min(to_h)) if to_h else 999
        days_since_holiday = int(min(since_h)) if since_h else 999
    else:
        is_holiday = int(is_weekend)
        days_to_holiday = 999
        days_since_holiday = 999

    # 외생변수: 기본은 마지막 관측값 유지
    temp_c = float(last_known_row.get("temp_c", 0.0))
    rain_mm = float(last_known_row.get("rain_mm", 0.0))
    promo = int(last_known_row.get("promo", 0))
    event_score_100 = float(last_known_row.get("event_score_100", 0.0))

    if future_exogenous:
        if "temp_c" in future_exogenous:
            temp_c = float(future_exogenous["temp_c"])
        if "rain_mm" in future_exogenous:
            rain_mm = float(future_exogenous["rain_mm"])
        if "promo" in future_exogenous:
            promo = int(future_exogenous["promo"])
        if "event_score_100" in future_exogenous:
            event_score_100 = float(future_exogenous["event_score_100"])

    is_event = int(event_score_100 > 0)
    major_event_flag = int(event_score_100 >= 70)
    event_score_x_weekend = float(event_score_100) * float(is_weekend)
    event_score_x_promo = float(event_score_100) * float(promo)

    lag_1 = _get_lag(history_demands, 1)
    lag_7 = _get_lag(history_demands, 7)
    lag_14 = _get_lag(history_demands, 14)
    lag_28 = _get_lag(history_demands, 28)

    last_7 = [float(x) for x in history_demands[-7:]]
    last_14 = [float(x) for x in history_demands[-14:]]
    last_28 = [float(x) for x in history_demands[-28:]]

    roll_mean_7 = _mean(last_7)
    roll_std_7 = _safe_std(last_7)
    roll_mean_14 = _mean(last_14)
    roll_std_14 = _safe_std(last_14)
    trend_28d = _mean(last_28)

    shop_total_lag_7 = float(last_known_row.get("shop_total_lag_7", 0.0))

    row = {
        "item_id": item_id,
        "temp_c": temp_c,
        "rain_mm": rain_mm,
        "is_holiday": is_holiday,
        "promo": promo,
        "event_score_100": event_score_100,
        "is_event": is_event,
        "major_event_flag": major_event_flag,
        "event_score_x_weekend": event_score_x_weekend,
        "event_score_x_promo": event_score_x_promo,
        "day_of_week": day_of_week,
        "is_weekend": is_weekend,
        "month": month,
        "day_of_month": day_of_month,
        "days_to_holiday": days_to_holiday,
        "days_since_holiday": days_since_holiday,
        "shop_total_lag_7": shop_total_lag_7,
        "trend_28d": trend_28d,
        "lag_1": lag_1,
        "lag_7": lag_7,
        "lag_14": lag_14,
        "lag_28": lag_28,
        "roll_mean_7": roll_mean_7,
        "roll_std_7": roll_std_7,
        "roll_mean_14": roll_mean_14,
        "roll_std_14": roll_std_14,
    }

    out = {c: row.get(c, 0) for c in feature_columns}
    return pd.DataFrame([out], columns=feature_columns)


def rolling_forecast_quantiles_gbr(
    *,
    models_by_q: dict[float, Any],
    feature_columns: list[str],
    raw_df: pd.DataFrame,
    feature_df: pd.DataFrame,
    item_id: str,
    as_of_date: pd.Timestamp,
    horizon_days: int,
    holiday_dates: set[pd.Timestamp] | None = None,
    future_exogenous_by_date: dict[str, dict[str, Any]] | None = None,
) -> dict[str, list[float]]:
    as_of_date = pd.to_datetime(as_of_date)

    history = (
        raw_df[(raw_df["item_id"].astype(str) == str(item_id)) & (pd.to_datetime(raw_df["date"]) <= as_of_date)]
        .sort_values("date")["demand_qty"]
        .astype(float)
        .tolist()
    )
    if not history:
        raise ValueError(f"No history for item_id={item_id} as_of_date={as_of_date.date()}")

    known = feature_df[
        (feature_df["item_id"].astype(str) == str(item_id))
        & (pd.to_datetime(feature_df["date"]) <= as_of_date)
    ].sort_values("date")
    if known.empty:
        raise ValueError(f"No feature row for item_id={item_id} <= {as_of_date.date()}")
    last_known_row = known.iloc[-1]

    out: dict[str, list[float]] = {f"q{int(q * 100)}": [] for q in models_by_q.keys()}
    history_for_features = list(history)

    for step in range(1, horizon_days + 1):
        next_date = as_of_date + pd.Timedelta(days=step)
        next_key = str(pd.to_datetime(next_date).date())
        future_exo = (future_exogenous_by_date or {}).get(next_key)

        X_next = _calc_features_for_next_day(
            feature_columns=feature_columns,
            item_id=item_id,
            next_date=next_date,
            history_demands=history_for_features,
            last_known_row=last_known_row,
            holiday_dates=holiday_dates,
            future_exogenous=future_exo,
        )

        step_preds: dict[str, float] = {}
        for q, model in models_by_q.items():
            pred = float(model.predict(X_next)[0])
            pred = max(0.0, pred)
            col = f"q{int(q * 100)}"
            out[col].append(pred)
            step_preds[col] = pred

        if "q50" in step_preds:
            history_for_features.append(step_preds["q50"])
        else:
            first_key = next(iter(step_preds.keys()))
            history_for_features.append(step_preds[first_key])

    return out


def run_demo(
    model_type: str = "gbr",
    timesteps: int = 14,
    epochs: int = 5,
    data_path: str | None = None,
    auto_search_csv: bool = True,
    verbose: bool = True,
    enrich_outputs: bool = True,
    forecast_horizons: tuple[int, ...] = (7, 30),
    unit_cost_map: dict[str, float] | None = None,
    inventory_lots_map: dict[str, list[InventoryLot]] | None = None,
    future_exogenous_by_date: dict[str, dict[str, Any]] | None = None,
    return_artifacts: bool = False,
    allow_short_history: bool = False,
    progress_callback = None,
) -> Any:
    """
    [전체 파이프라인(End-to-End) 실행 데모]
    1. 데이터 생성/로드 -> 2. 피처 생성 -> 3. 학습/테스트 분리
    -> 4. 모델 학습 -> 5. 최종 발주 수량 및 외생변수 기여도 추출
    """
    if progress_callback:
        progress_callback(10, "preprocessing")

    if data_path or auto_search_csv:
        bundle = auto_prepare_dataset(
            preferred_csv=data_path,
            auto_search_csv=auto_search_csv,
            synthetic_days=460,
            timesteps=timesteps,
            verbose=verbose,
            allow_short_history=allow_short_history,
        )
        raw_df = bundle["raw_df"]
        feature_df = bundle["feature_df"]
        feature_columns = bundle["feature_columns"]
    # run_demo()의 else 분기 교체
    else:
        raw_df = make_synthetic_cafe_data()
        feature_df = create_features(raw_df)
        feature_columns = DEFAULT_FEATURE_COLUMNS

    # 마지막 28일치(Test)를 오로지 평가용으로 은닉하고 그 이전(Train)으로만 학습
    raw_df["date"] = pd.to_datetime(raw_df["date"], errors="coerce")
    feature_df["date"] = pd.to_datetime(feature_df["date"], errors="coerce")

    # short history: 데이터가 너무 짧으면 모델 학습 대신 naive baseline으로 결과를 만든다.
    min_item_days_raw = 0
    if not raw_df.empty and {"item_id", "date"}.issubset(raw_df.columns):
        min_item_days_raw = int(raw_df.groupby("item_id")["date"].nunique().min())

    if allow_short_history and min_item_days_raw > 0 and min_item_days_raw < 10:
        if verbose:
            print(
                f"[SHORT] min_item_days={min_item_days_raw} is too small for training; using naive baseline forecasts"
            )

        as_of_date = pd.to_datetime(raw_df["date"].max())
        target_date = as_of_date + pd.Timedelta(days=1)

        recs = []
        unit_cost_map = unit_cost_map or {}
        inventory_lots_map = inventory_lots_map or {}

        for item_id, g in raw_df.sort_values("date").groupby("item_id"):
            hist = g["demand_qty"].astype(float).tolist()
            tail = hist[-min(7, len(hist)) :]
            q50_daily = float(np.mean(tail)) if tail else 0.0
            sigma = float(np.std(tail, ddof=1)) if len(tail) > 1 else 0.0
            q95_daily = float(max(q50_daily, q50_daily + 1.645 * sigma))
            if sigma == 0.0:
                q95_daily = float(q50_daily * 1.15)

            last = g.sort_values("date").iloc[-1]
            current_inventory = float(last.get("current_inventory", 0))
            lead_time_days = int(last.get("lead_time_days", 2))
            review_period_days = int(last.get("review_period_days", 2))
            moq = int(last.get("moq", 5))
            unit_margin = float(last.get("unit_margin", 1500))
            unit_holding_cost = float(last.get("unit_holding_cost", 180))

            rec = calculate_optimal_order(
                current_inventory=current_inventory,
                mean_daily_demand=q50_daily,
                p95_daily_demand=q95_daily,
                lead_time_days=lead_time_days,
                review_period_days=review_period_days,
                moq=moq,
                unit_margin=unit_margin,
                unit_holding_cost=unit_holding_cost,
            )

            priority = compute_order_priority(
                current_inventory=float(current_inventory),
                target_stock=float(rec["target_stock"]),
            )

            unit_cost = float(last.get("unit_cost", unit_cost_map.get(str(item_id), 0.0)))
            expected_cost = compute_expected_total_cost(
                recommended_order_qty=int(rec["recommended_order_qty"]),
                unit_cost=unit_cost,
            )

            row_out = {
                "date": target_date,
                "item_id": str(item_id),
                "current_inventory": int(current_inventory),
                "q50_daily": round(float(q50_daily), 2),
                "q95_daily": round(float(q95_daily), 2),
                "protection_days": rec["protection_days"],
                "service_level": round(rec["service_level"], 4),
                "target_stock": rec["target_stock"],
                "recommended_order_qty": rec["recommended_order_qty"],
                "priority": priority,
                "unit_cost": unit_cost,
                "expected_total_cost": expected_cost,
            }

            for horizon in forecast_horizons:
                h = int(horizon)
                row_out[f"forecast_q50_{h}d"] = [float(q50_daily)] * h
                row_out[f"forecast_q95_{h}d"] = [float(q95_daily)] * h

            lots = inventory_lots_map.get(str(item_id), [])
            if lots and 7 in forecast_horizons:
                fefo_7 = simulate_fefo_expected_waste(lots, row_out.get("forecast_q50_7d", []))
                row_out["expected_waste_qty_7d"] = int(fefo_7["expected_waste_qty"])
                row_out["expected_lost_sales_qty_7d"] = int(fefo_7["expected_lost_sales_qty"])
            else:
                row_out["expected_waste_qty_7d"] = 0
                row_out["expected_lost_sales_qty_7d"] = 0

            recs.append(row_out)

        recommendation_df = pd.DataFrame(recs).sort_values("item_id").reset_index(drop=True)
        metrics_df = pd.DataFrame(
            [
                {"metric": "MAE (q50)", "value": np.nan},
                {"metric": "RMSE (q50)", "value": np.nan},
                {"metric": "Pinball Loss (q95)", "value": np.nan},
            ]
        )
        fi_df = pd.DataFrame(
            {"feature": ["naive_baseline"], "importance": [1.0], "importance_percentage": [100.0]}
        )

        if progress_callback:
            progress_callback(100, "modelApplication")

        if return_artifacts:
            artifacts = ModelArtifacts(
                models={},
                feature_columns=DEFAULT_FEATURE_COLUMNS,
                raw_df=raw_df,
                feature_df=feature_df,
                as_of_date=as_of_date,
                model_type="naive",
            )
            return metrics_df, recommendation_df, fi_df, artifacts

        return metrics_df, recommendation_df, fi_df

    # 일반/short-history 학습 split
    unique_days = int(feature_df["date"].nunique()) if not feature_df.empty else 0
    if allow_short_history and unique_days > 0 and unique_days < 40:
        test_days = max(1, min(14, unique_days // 4))
        cutoff_date = feature_df["date"].max() - pd.Timedelta(days=test_days)
    else:
        cutoff_date = feature_df["date"].max() - pd.Timedelta(days=28)

    train_df = feature_df[feature_df["date"] <= cutoff_date].copy()
    test_df = feature_df[feature_df["date"] > cutoff_date].copy()
    if allow_short_history and train_df.empty:
        train_df = feature_df.copy()
        test_df = feature_df.iloc[0:0].copy()

    if progress_callback:
        progress_callback(40, "patternAnalysis")

    # 입력 인자에 따라 사용할 모델 엔진(GBR 또는 LSTM) 분기 처리
    if model_type == "gbr":
        models = train_quantile_models(
            train_df,
            feature_columns,
            quantiles=(0.5, 0.95),
            allow_short_history=allow_short_history,
        )
        
        # [프론트엔드용 추가 요건] 외생변수 기여도(Feature Importance) 추출
        # 트리 기반 GBR 모델에서 어떤 변수가 수요 예측에 가장 큰 영향을 주었는지(XAI) 뽑아냄
        q50_model = models[0.5]
        gbr_step = q50_model.named_steps["gbr"]
        prep_step = q50_model.named_steps["prep"]
        feature_names = prep_step.get_feature_names_out()
        importances = gbr_step.feature_importances_
        fi_df = pd.DataFrame({"feature": feature_names, "importance": importances})
        fi_df = fi_df.sort_values(by="importance", ascending=False).reset_index(drop=True)
        fi_df["importance_percentage"] = (fi_df["importance"] * 100).round(2)
    elif model_type == "lstm":
        models = train_lstm_quantile_models(
            train_df, feature_columns, quantiles=(0.5, 0.95), timesteps=timesteps, epochs=epochs
        )
        # LSTM의 경우 복잡한 신경망 구조로 인해 feature_importance를 GBR처럼 단순 추출하기 어려우므로,
        # 임시로 빈 데이터프레임을 반환합니다. (추후 SHAP 등 XAI 기법 적용 가능)
        fi_df = pd.DataFrame({"feature": ["LSTM_XAI_Requires_SHAP"], "importance": [1.0], "importance_percentage": [100.0]})
    else:
        raise ValueError("Unknown model_type: choose 'gbr' or 'lstm'")

    if progress_callback:
        progress_callback(70, "modelApplication")

    # 평가용 데이터로 모델 정확도 Metrics 생성
    if test_df.empty:
        metrics_df = pd.DataFrame(
            [
                {"metric": "MAE (q50)", "value": np.nan},
                {"metric": "RMSE (q50)", "value": np.nan},
                {"metric": "Pinball Loss (q95)", "value": np.nan},
            ]
        )
    else:
        pred_test = predict_quantiles(models, test_df, feature_columns)
        metrics_df = evaluate_forecast(pred_test)

    # 가장 최근 날짜의 예측값을 기준으로 실시간 발주 계획 수립
    latest_date = pred_test["date"].max()
    latest_pred = pred_test[pred_test["date"] == latest_date].copy()

    latest_meta = (
        feature_df[feature_df["date"] == latest_date][
            [
                "item_id",
                "current_inventory",
                "lead_time_days",
                "review_period_days",
                "moq",
                "unit_margin",
                "unit_holding_cost",
                "unit_cost",
            ]
        ]
        .drop_duplicates(subset=["item_id"])
    )

    # 품목별 예측량과 운영 제약 메타 데이터를 병합
    order_plan = latest_pred.merge(latest_meta, on="item_id", how="left")

    recs = []

    unit_cost_map = unit_cost_map or {}
    inventory_lots_map = inventory_lots_map or {}

    holiday_dates: set[pd.Timestamp] | None
    if "is_holiday" in raw_df.columns:
        holiday_dates = set(pd.to_datetime(raw_df.loc[raw_df["is_holiday"] == 1, "date"]).dt.normalize().unique())
    else:
        holiday_dates = None

    # 계산된 최적 발주 로직(calculate_optimal_order)을 각 품목별(행)로 순회하며 적용
    for _, row in order_plan.iterrows():
        item_id = str(row["item_id"])
        unit_cost = float(row.get("unit_cost", unit_cost_map.get(item_id, 0.0)))

        # 기본값: 평가(test) 데이터의 마지막 날짜 예측치를 사용
        target_date = pd.to_datetime(row["date"])
        q50_daily = float(row["q50"])
        q95_daily = float(row["q95"])
        paths_max: dict[str, list[float]] | None = None

        # enrich_outputs가 켜진 GBR 경로에서는 '내일' 예측치를 기준으로 발주량 계산 (API 스키마 정합)
        if enrich_outputs and model_type == "gbr":
            max_horizon = int(max(forecast_horizons)) if forecast_horizons else 1
            try:
                paths_max = rolling_forecast_quantiles_gbr(
                    models_by_q=models,
                    feature_columns=feature_columns,
                    raw_df=raw_df,
                    feature_df=feature_df,
                    item_id=item_id,
                    as_of_date=latest_date,
                    horizon_days=max_horizon,
                    holiday_dates=holiday_dates,
                    future_exogenous_by_date=future_exogenous_by_date,
                )
                if paths_max.get("q50"):
                    q50_daily = float(paths_max["q50"][0])
                if paths_max.get("q95"):
                    q95_daily = float(paths_max["q95"][0])
                target_date = pd.to_datetime(latest_date) + pd.Timedelta(days=1)
            except Exception:
                paths_max = None

        rec = calculate_optimal_order(
            current_inventory=row["current_inventory"],
            mean_daily_demand=q50_daily,
            p95_daily_demand=q95_daily,
            lead_time_days=row["lead_time_days"],
            review_period_days=row["review_period_days"],
            moq=row["moq"],
            unit_margin=row["unit_margin"],
            unit_holding_cost=row["unit_holding_cost"],
        )

        base = {
            "date": target_date,
            "item_id": item_id,
            "current_inventory": int(row["current_inventory"]),
            "q50_daily": round(float(q50_daily), 2),
            "q95_daily": round(float(q95_daily), 2),
            "protection_days": rec["protection_days"],
            "service_level": round(rec["service_level"], 4),
            "target_stock": rec["target_stock"],
            "recommended_order_qty": rec["recommended_order_qty"],
        }

        if enrich_outputs:
            priority = compute_order_priority(
                current_inventory=float(row["current_inventory"]),
                target_stock=float(rec["target_stock"]),
            )
            expected_cost = compute_expected_total_cost(
                recommended_order_qty=int(rec["recommended_order_qty"]),
                unit_cost=unit_cost,
            )

            base.update(
                {
                    "priority": priority,
                    "unit_cost": unit_cost,
                    "expected_total_cost": expected_cost,
                }
            )

            if model_type == "gbr":
                # 이미 max horizon을 예측했으면 slice로 채우고, 없으면 개별 horizon을 예측
                for horizon in forecast_horizons:
                    h = int(horizon)
                    if paths_max is not None and paths_max.get("q50") and paths_max.get("q95"):
                        base[f"forecast_q50_{h}d"] = [float(x) for x in paths_max.get("q50", [])[:h]]
                        base[f"forecast_q95_{h}d"] = [float(x) for x in paths_max.get("q95", [])[:h]]
                        continue

                    try:
                        paths = rolling_forecast_quantiles_gbr(
                            models_by_q=models,
                            feature_columns=feature_columns,
                            raw_df=raw_df,
                            feature_df=feature_df,
                            item_id=item_id,
                            as_of_date=latest_date,
                            horizon_days=h,
                            holiday_dates=holiday_dates,
                            future_exogenous_by_date=future_exogenous_by_date,
                        )
                        base[f"forecast_q50_{h}d"] = [float(x) for x in paths.get("q50", [])]
                        base[f"forecast_q95_{h}d"] = [float(x) for x in paths.get("q95", [])]
                    except Exception:
                        base[f"forecast_q50_{h}d"] = []
                        base[f"forecast_q95_{h}d"] = []

                lots = inventory_lots_map.get(item_id, [])
                if lots:
                    fefo_7 = simulate_fefo_expected_waste(
                        lots,
                        base.get("forecast_q50_7d", []),
                    )
                    base["expected_waste_qty_7d"] = int(fefo_7["expected_waste_qty"])
                    base["expected_lost_sales_qty_7d"] = int(fefo_7["expected_lost_sales_qty"])
                else:
                    base["expected_waste_qty_7d"] = 0
                    base["expected_lost_sales_qty_7d"] = 0

        recs.append(base)

    recommendation_df = pd.DataFrame(recs).sort_values("item_id").reset_index(drop=True)

    if progress_callback:
        progress_callback(100, "modelApplication")

    if return_artifacts:
        artifacts = ModelArtifacts(
            models=models,
            feature_columns=feature_columns,
            raw_df=raw_df,
            feature_df=feature_df,
            as_of_date=pd.to_datetime(latest_date),
            model_type=model_type,
        )
        return metrics_df, recommendation_df, fi_df, artifacts

    return metrics_df, recommendation_df, fi_df


if __name__ == "__main__":
    metrics, recommendations, fi = run_demo(auto_search_csv=False)
    print("=== Forecast Metrics ===")
    print(metrics.to_string(index=False))
    print("\n=== Recommended Orders ===")
    print(recommendations.to_string(index=False))
    print("\n=== Feature Importances (외생변수 기여도) ===")
    print(fi.head(10).to_string(index=False))