요구사항 요약 (신청서·결과보고서 기반)

핵심 목표
- 다변량(기상·프로모션·휴일 등) 기반의 수요 예측
- 확률적 예측(분위수/분포) → 규범적 최적화(정기발주, MOQ 고려)로 발주 권고
- FEFO(유통기한)·폐기 로그 피드백을 통한 MLOps 자동화(향후 확장)
- 경량화된 SaaS PoC: backend(Django) + frontend(React), 비전문가 UX

입력 스키마 (권장 최소값)
- date (YYYY-MM-DD), item_id, demand_qty, temp_c, rain_mm, is_holiday, promo
- 재고/발주 관련: current_inventory, lead_time_days, review_period_days, moq, unit_margin, unit_holding_cost

모델/성능 요구
- 예측: 확률적 출력(예: q50, q95) — 핀볼손실(Quantile Loss) 사용
- 모델 후보: (A) Stacked LSTM (Keras) — 논문/보고서 채택, 다변량 시계열 처리, 14일 타임스텝 권장
             (B) 트리 기반 Quantile Regressor(이미 구현됨) — 경량화·해석성 유리
- 평가 지표: MAE, RMSE, Pinball Loss(q95)

최적화/비즈니스 규칙
- 정기검토(R, S) 기반 주문량 계산
- 서비스 레벨은 비용비율(underage/overage)로 도출
- MOQ(최소발주량) 반영, 리드타임·검토기간 합산(protection days)

우선 작업(단계별)
1) 현재 구현(트리 기반 quantile) 검증 및 문서화 — 빠른 데모용
2) LSTM(선택) 추가 옵션 구현(환경: TensorFlow 필요) — 성능 향상 시 선택
3) FEFO·폐기 로그 스키마 설계 및 입력 파이프라인 추가(향후)
4) run script/CLI 개선, 결과 저장(export), 간단한 시각화 추가

