# Cafe Demand Forecasting + Order Optimization

This project builds a multivariate demand forecasting model and converts forecasts into inventory order recommendations.

## What it does
- Builds multivariate features from date, weather, holiday, promotion, and lag/rolling demand signals
- Trains quantile regression models for demand (`q50`, `q95`)
- Evaluates forecast quality with MAE, RMSE, and pinball loss
- Calculates item-level reorder quantity with periodic review logic (`R, S`) and MOQ constraints

## Files
- `모델_관련_코드_모음.ipynb`: end-to-end notebook version (executed and validated)
- `cafe_demand_inventory_model.py`: reusable Python module
- `run_model.py`: minimal runner script
- `requirements.txt`: required packages

## Quick start
```bash
pip install -r requirements.txt
python run_model.py
```

## 바로 써보기 (배포 zip 기준)

배포 zip을 압축 해제한 뒤, 해당 폴더에서 아래 커맨드로 바로 실행할 수 있습니다.

1) 의존성 설치
```bash
pip install -r requirements.txt
```

2) 샘플 CSV로 실행(히스토리 짧아도 실행되도록 허용)
```bash
python run_model.py --model gbr --data "(sample)DH_CAFE_SALES_DATA (1).csv" --no-auto-csv --allow-short-history
```

3) 결과 저장(표준 CSV 3종)
```bash
python save_results.py --model gbr --data "(sample)DH_CAFE_SALES_DATA (1).csv" --no-auto-csv --allow-short-history
```

### CLI examples

합성 데이터로 실행(기본 데모):
```bash
python run_model.py --model gbr --no-auto-csv
```

실데이터 CSV로 실행:
```bash
python run_model.py --model gbr --data "YOUR_DATA.csv"
```

실데이터 히스토리가 짧아도 강제로 실행(학습 대신 naive baseline으로라도 결과 생성):
```bash
python run_model.py --model gbr --data "YOUR_DATA.csv" --no-auto-csv --allow-short-history
```

결과 저장(표준 CSV 3종 생성):
```bash
python save_results.py --model gbr --data "YOUR_DATA.csv" --no-auto-csv --allow-short-history
```

저장되는 파일:
- `results/metrics.csv`
- `results/recommendations.csv`
- `results/feature_importance.csv`

## Input schema (for real data)
이 프로젝트는 CSV 스키마를 2가지 방식으로 받아들입니다(자동 감지).

### A) 정규화된 일별 수요 CSV (권장)
하루-상품 1행 기준으로 최소 아래 컬럼이 필요합니다:
- `date` (YYYY-MM-DD)
- `item_id` (string)
- `demand_qty` (number)

옵션:
- `sales_amount` (number)

날씨/프로모션/행사 같은 외생변수 컬럼은 없어도 되며, 없으면 내부에서 기본값으로 채워 실행합니다.

### B) 원본 POS export CSV (샘플 파일 형식)
원본 POS 파일을 그대로 넣어도 동작합니다. 필수 컬럼(대문자 기준):
- `SALES_DE` (예: 20240101)
- `LCLAS_CD` (음료는 `BEVERAGE`)
- `ORDER_CN` (수량으로 파싱 가능한 경우)

주의:
- 일부 POS export에서는 `ORDER_CN`이 문자열(예: “일반”)일 수 있으며, 이 경우 수량은 `SLE_CO`를 사용합니다(있을 때 자동 fallback).

Recommended inventory fields:
- `current_inventory`
- `lead_time_days`
- `review_period_days`
- `moq`
- `unit_margin`
- `unit_holding_cost`

## 모델 아키텍처 및 핵심 로직 (Model Architecture & Core Logic)

본 프로젝트는 수요 예측을 위해 두 가지 알고리즘(GBR, LSTM)을 지원하며, 예측된 수요를 기반으로 수학적 최적 발주량을 산출합니다.

### 1. 외생변수 반영 및 예측 모델링
모델은 기온(`temp_c`), 강수량(`rain_mm`), 공휴일 여부(`is_holiday`), 프로모션(`promo`) 등의 외생변수(이벤트)를 입력으로 받아 다음과 같이 학습합니다:
*   **트리 앙상블 (Gradient Boosting Regressor)**:
    *   **작동 방식**: 여러 개의 의사결정 나무가 연속적으로 분류(분기)하며 학습합니다.
    *   **외생변수 반영**: "비가 오고(`rain_mm>0`) 온도가 낮은(`temp_c<10`) 날"과 같이 복잡한 비선형적 상호작용 조건을 분기 트리로 스스로 학습하여 최종 수요 상승/하락 폭을 결정합니다.
*   **시계열 딥러닝 (LSTM)**:
    *   **작동 방식**: `create_lstm_sequences` 윈도우 슬라이딩 함수를 통해 과거 N일치(`timesteps`)의 연속형 숫자 데이터를 3차원(`Samples × Timesteps × Features`) 시퀀스로 변환한 뒤 정규화(Standard Scaler)하여 학습합니다.
    *   **외생변수 반영**: 단 하루의 독립적 이벤트가 아니라, "어제 비가 많이 왔고 오늘 프로모션을 진행한다"는 시간적 흐름(Trend/Lag)의 연속적인 영향을 은닉층의 가중치(Weight)로 환산하여 학습합니다.

### 2. 재고 최적화 수식 (Inventory Optimization)
예측된 일별 수요를 기반으로 뉴즈벤더(Newsvendor) 모델 기반 수식을 적용해 실제 발주량을 도출합니다:
*   **(목표 서비스 수준)**: 판매 시 마진(`unit_margin`)과 악성 재고 시의 보유/폐기 비용(`unit_holding_cost`)의 비율로 결품 방지 확률을 도출합니다. `Service Level = Margin / (Margin + Holding Cost)`
*   **(목표 재고 산출)**: 안전 기간(리드 타임 + 리뷰 주기) 동안 방어해야 할 "총 수요(q50 누적)"와 "수요 변동성(q95 기반 분산)"을 정규분포 역함수(Z-score)에 대입하여 최종 안전 목표 재고(Order-Up-To Level)를 도출합니다.
*   **(최종 제약 반영)**: 산출된 목표 재고에서 현재고(`current_inventory`)를 뺀 뒤, 물류 최소 발주 단위(`MOQ`) 규격에 맞춰 최종 수량을 올림(Ceiling)하여 반환합니다.

## Notes
- The notebook and script currently include a synthetic data generator so the pipeline runs without external CSV files.
- Replace synthetic data with your actual cafe dataset for production usage.

### Short history 모드 주의
- 기본 모드는 아이템별 최소 히스토리가 충분할 때(일반적으로 lag/rolling/trend 생성 가능할 때)만 학습/예측을 수행합니다.
- `--allow-short-history`를 켜면 히스토리가 짧아도 동작하지만, 정확도가 떨어질 수 있고(특히 1~몇 일치) 성능 지표가 `NaN`으로 나올 수 있습니다.
