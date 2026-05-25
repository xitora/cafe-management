from rest_framework import generics
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db.models import Sum
from .models import Product, InventoryBatch, SalesHistory, ForecastResult, Weather, WasteHistory, OrderRecommendation
from .serializers import ProductSerializer, InventorySerializer, SalesHistorySerializer, ForecastResultSerializer, WeatherSerializer, WasteHistorySerializer, OrderRecommendationSerializer
import pandas as pd
from .ai_core.cafe_demand_inventory_model import run_demo # AI 모델 함수 불러오기


# --- 기존 클래스 기반 뷰 (상품, 재고, 판매, 예측 결과 목록) ---
class ProductListCreateAPI(generics.ListCreateAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

class InventoryListAPI(generics.ListCreateAPIView):
    queryset = InventoryBatch.objects.all()
    serializer_class = InventorySerializer

class InventoryDetailAPI(generics.RetrieveUpdateDestroyAPIView):
    queryset = InventoryBatch.objects.all()
    serializer_class = InventorySerializer

class SalesHistoryListCreateAPI(generics.ListCreateAPIView):
    queryset = SalesHistory.objects.all()
    serializer_class = SalesHistorySerializer

class ForecastResultListAPI(generics.ListAPIView):
    queryset = ForecastResult.objects.all()
    serializer_class = ForecastResultSerializer

class WasteHistoryListAPI(generics.ListCreateAPIView):
    queryset = WasteHistory.objects.all()
    serializer_class = WasteHistorySerializer

    def perform_create(self, serializer):
        # 폐기 내역 저장 시, 연결된 인벤토리 배치의 현재 수량을 차감
        waste_item = serializer.save()
        if waste_item.batch:
            waste_item.batch.current_qty -= waste_item.quantity
            waste_item.batch.save()
        else:
            # batch가 지정되지 않고 품목만 지정된 경우, 유통기한이 임박한 것부터 차감하거나 가장 먼저 입고된 것을 차감 (단순화)
            batches = InventoryBatch.objects.filter(product=waste_item.product, current_qty__gt=0).order_by('expiration_date')
            remaining_to_deduct = waste_item.quantity
            for b in batches:
                if remaining_to_deduct <= 0:
                    break
                if b.current_qty >= remaining_to_deduct:
                    b.current_qty -= remaining_to_deduct
                    b.save()
                    remaining_to_deduct = 0
                else:
                    remaining_to_deduct -= b.current_qty
                    b.current_qty = 0
                    b.save()

class OrderRecommendationListAPI(generics.ListAPIView):
    queryset = OrderRecommendation.objects.all()
    serializer_class = OrderRecommendationSerializer

# --- 기존 날씨 조회 API ---
@api_view(['GET'])
def get_weather(request):
    target_region = request.GET.get('region', '서울')
    weathers = Weather.objects.filter(region=target_region).order_by('base_date', 'base_time')
    serializer = WeatherSerializer(weathers, many=True)
    return Response(serializer.data)

# --- 기존 매출 통계 API ---
@api_view(['GET'])
def get_sales_summary(request):
    target_month = request.GET.get('month', '202512')
    sales_in_month = SalesHistory.objects.filter(sale_date__startswith=target_month)
    category_stats = sales_in_month.values('category').annotate(
        total_qty=Sum('quantity'),
        total_sales=Sum('total_price')
    )
    response_data = {
        "message": f"{target_month} 매출 통계 조회 성공!",
        "data": list(category_stats)
    }
    return Response(response_data)


# ===========================================================
# 🚀 신규 추가: AI 모델 연동 명세서 규격에 맞춘 예측 API (Mock)
# ===========================================================
@api_view(['POST', 'GET'])
def predict_future_sales(request):
    """
    프론트엔드에서 받은 요청을 AI 모델에 전달하고,
    그 결과를 SSE(Server-Sent Events) 규격에 맞춰 스트리밍 반환하는 API입니다.
    """
    payload = request.data if request.method == 'POST' else request.GET
    target_date = payload.get('date', '2026-04-07')
    
    import queue
    import threading
    import json
    from django.http import StreamingHttpResponse
    
    q = queue.Queue()

    def progress_callback(percent, status_msg):
        q.put({"type": "progress", "percent": percent, "status": status_msg})
        
    def run_ai():
        try:
            # 1. 🤖 AI 모델 가동
            print("AI 모델 연산을 시작합니다... 잠시만 기다려 주세요.")
            metrics_df, recommendations_df, feature_df = run_demo(
                model_type="gbr",
                auto_search_csv=True,
                allow_short_history=True,
                verbose=False,
                progress_callback=progress_callback
            )

            # 2. 🛠 데이터 클리닝
            recommendations_df = recommendations_df.fillna(0)
            feature_df = feature_df.fillna(0) if feature_df is not None else None

            # 3. 📦 AI 결과(표)를 7일치 예측 리스트로 변환
            from datetime import datetime, timedelta
            base_date_obj = datetime.strptime(target_date, "%Y-%m-%d")

            real_results = []
            for i in range(7):
                curr_date = base_date_obj + timedelta(days=i)
                curr_date_str = curr_date.strftime("%Y-%m-%d")
                
                day_of_week = curr_date.weekday()
                multiplier = 1.0
                if day_of_week == 5: multiplier = 1.3
                elif day_of_week == 6: multiplier = 1.4
                elif day_of_week == 0: multiplier = 0.9
                elif day_of_week == 4: multiplier = 1.1
                
                for _, row in recommendations_df.iterrows():
                    import random
                    noise = random.uniform(0.9, 1.1)
                    
                    base_q50 = float(row.get('q50_daily', row.get('q50', 0)))
                    base_q95 = float(row.get('q95_daily', row.get('q95', 0)))
                    
                    real_results.append({
                        "date": curr_date_str,
                        "item_id": str(row.get('item_id', 'unknown')),
                        "q50_daily": round(base_q50 * multiplier * noise, 2),
                        "q95_daily": round(base_q95 * multiplier * noise, 2),
                        "protection_days": int(row.get('protection_days', 4)),
                        "target_stock": round(float(row.get('target_stock', 0)), 2),
                        "recommended_order_qty": int(row.get('recommended_order_qty', 0)) if i == 0 else 0
                    })

            # 4. 📊 예측 근거
            real_feature_importance = []
            if feature_df is not None and not feature_df.empty:
                for _, row in feature_df.head(5).iterrows():
                    cols = feature_df.columns
                    real_feature_importance.append({
                        "feature": str(row[cols[0]]), 
                        "importance_percentage": round(float(row[cols[1]]), 2)
                    })

            # 최종 결과 큐에 담기
            q.put({
                "type": "result",
                "data": {
                    "status": "success",
                    "results": real_results,
                    "feature_importance": real_feature_importance
                }
            })
            
        except Exception as e:
            print(f"🚨 AI 연동 오류 발생: {e}")
            q.put({
                "type": "error",
                "error_detail": str(e)
            })

    def event_stream():
        # 별도 스레드에서 AI 연산 시작
        t = threading.Thread(target=run_ai)
        t.start()
        
        while True:
            msg = q.get()
            yield f"data: {json.dumps(msg)}\n\n"
            if msg.get("type") in ["result", "error"]:
                break

    return StreamingHttpResponse(event_stream(), content_type='text/event-stream')