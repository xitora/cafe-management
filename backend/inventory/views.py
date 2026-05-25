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

import os
import requests
from datetime import datetime, timedelta
from .kma_grid import lat_lon_to_nx_ny

# --- 신규: 온디맨드 날씨 조회 API ---
@api_view(['GET'])
def get_weather(request):
    lat_str = request.GET.get('lat')
    lon_str = request.GET.get('lon')
    region_name = request.GET.get('region', '서울') 

    if lat_str and lon_str:
        try:
            lat = float(lat_str)
            lon = float(lon_str)
            nx, ny = lat_lon_to_nx_ny(lat, lon)
            cache_region = f"GRID_{nx}_{ny}"
        except ValueError:
            nx, ny = 61, 125 
            cache_region = region_name
    else:
        # Fallback
        nx, ny = 61, 125
        cache_region = region_name

    now = datetime.now()
    base_date = now.strftime('%Y%m%d')
    base_time = '0500' # 단기예보 새벽 5시 발표 기준 (단순화)

    # 1. 캐싱 확인: 오늘 이후의 날씨 데이터가 해당 격자(GRID)로 존재하는가?
    existing_weather = Weather.objects.filter(region=cache_region, base_date__gte=base_date).order_by('base_date', 'base_time')
    
    # KMA 단기예보는 1시간 단위이므로 내일 데이터까지 충분히 있으려면 최소 24개 이상의 레코드가 있어야 함.
    if existing_weather.count() >= 24:
        serializer = WeatherSerializer(existing_weather, many=True)
        return Response(serializer.data)
    else:
        # 불완전한 캐시 삭제
        existing_weather.delete()
        
    # 2. 없으면 기상청 API 실시간 호출
    url = 'http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst'
    my_key = os.environ.get('WEATHER_API_KEY')
    
    def inject_mock_data():
        import random
        Weather.objects.update_or_create(base_date=base_date, base_time=base_time, region=cache_region, defaults={'temperature': random.uniform(15.0, 25.0), 'precipitation': 0.0, 'pty_code': 0})
        tomorrow = (now + timedelta(days=1)).strftime('%Y%m%d')
        Weather.objects.update_or_create(base_date=tomorrow, base_time=base_time, region=cache_region, defaults={'temperature': random.uniform(15.0, 25.0) + 3, 'precipitation': random.choice([0.0, 0.0, 5.0]), 'pty_code': random.choice([0, 1, 3])})

    if not my_key:
        print("⚠️ WEATHER_API_KEY가 설정되지 않아 가상(Mock) 날씨 데이터를 캐싱합니다.")
        inject_mock_data()
    else:
        params = {
            'serviceKey': my_key,
            'pageNo': '1',
            'numOfRows': '1000',
            'dataType': 'JSON',
            'base_date': base_date,
            'base_time': base_time,
            'nx': nx,
            'ny': ny
        }

        try:
            response = requests.get(url, params=params, timeout=5)
            if response.status_code == 200:
                data = response.json()
                items = data.get('response', {}).get('body', {}).get('items', {}).get('item', [])
                
                weather_dict = {}
                for item in items:
                    date = item['fcstDate']
                    time = item['fcstTime']
                    category = item['category']
                    value = item['fcstValue']
                    
                    key = f"{date}_{time}"
                    if key not in weather_dict:
                        weather_dict[key] = {'base_date': date, 'base_time': time, 'tmp': None, 'rn1': 0.0, 'pty': 0}
                        
                    if category == 'TMP':
                        weather_dict[key]['tmp'] = float(value)
                    elif category in ['PCP', 'RN1']:
                        if value == "강수없음":
                            weather_dict[key]['rn1'] = 0.0
                        else:
                            try:
                                weather_dict[key]['rn1'] = float(value.replace("mm", ""))
                            except ValueError:
                                weather_dict[key]['rn1'] = 0.0
                    elif category == 'PTY':
                        try:
                            weather_dict[key]['pty'] = int(value)
                        except ValueError:
                            weather_dict[key]['pty'] = 0

                for key, val in weather_dict.items():
                    if val['tmp'] is not None:
                        Weather.objects.update_or_create(
                            base_date=val['base_date'],
                            base_time=val['base_time'],
                            region=cache_region,
                            defaults={
                                'temperature': val['tmp'],
                                'precipitation': val['rn1'],
                                'pty_code': val['pty']
                            }
                        )
            else:
                inject_mock_data()
        except Exception as e:
            print("Weather API fetch error:", e)
            inject_mock_data()

    existing_weather = Weather.objects.filter(region=cache_region, base_date__gte=base_date).order_by('base_date', 'base_time')
    serializer = WeatherSerializer(existing_weather, many=True)
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
        import time
        q.put({"type": "progress", "percent": percent, "status": status_msg})
        time.sleep(1.5) # AI 예측에 시간이 3배 더 걸리는 것을 시뮬레이션
        
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
            
            weight_modifier = 0.0
            
            weather_list = payload.get('weather', [])
            if '비' in weather_list: weight_modifier -= 0.10
            if '눈' in weather_list: weight_modifier -= 0.15
            if '우박' in weather_list: weight_modifier -= 0.30
            if '안개' in weather_list: weight_modifier -= 0.05
            if '폭염' in weather_list: weight_modifier += 0.20
            if '황사' in weather_list: weight_modifier -= 0.10
            
            event_list = payload.get('events', [])
            if '지역 축제' in event_list: weight_modifier += 0.30
            if '스포츠 경기' in event_list: weight_modifier += 0.25
            if '콘서트' in event_list: weight_modifier += 0.20
            if '전시회' in event_list: weight_modifier += 0.10
            
            for i in range(3):
                curr_date = base_date_obj + timedelta(days=i)
                curr_date_str = curr_date.strftime("%Y-%m-%d")
                
                day_of_week = curr_date.weekday()
                multiplier = 1.0
                if day_of_week == 5: multiplier = 1.3
                elif day_of_week == 6: multiplier = 1.4
                elif day_of_week == 0: multiplier = 0.9
                elif day_of_week == 4: multiplier = 1.1
                
                # 가중치 반영 (1.0 + weight_modifier)
                final_multiplier = multiplier * (1.0 + weight_modifier)
                if final_multiplier < 0.1: final_multiplier = 0.1 # 최소 하한선 10%
                
                for _, row in recommendations_df.iterrows():
                    import random
                    noise = random.uniform(0.9, 1.1)
                    
                    base_q50 = float(row.get('q50_daily', row.get('q50', 0)))
                    base_q95 = float(row.get('q95_daily', row.get('q95', 0)))
                    
                    real_results.append({
                        "date": curr_date_str,
                        "item_id": str(row.get('item_id', 'unknown')),
                        "q50_daily": round(base_q50 * final_multiplier * noise, 2),
                        "q95_daily": round(base_q95 * final_multiplier * noise, 2),
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