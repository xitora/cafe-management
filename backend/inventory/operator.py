from apscheduler.schedulers.background import BackgroundScheduler
from django_apscheduler.jobstores import DjangoJobStore
from .models import Weather
import requests
from datetime import datetime 
import os                     # 👈 추가
from dotenv import load_dotenv

load_dotenv()


def update_weather_job():
    print("⏰ 자동 날씨 업데이트 시작...")

    # 1. 파이썬이 스스로 '오늘 날짜'를 알아냅니다. (예: 20260413)
    today_str = datetime.now().strftime('%Y%m%d')

    # 2. 찬우님이 세팅해둔 완벽한 지역 좌표!
    REGION_COORDS = {
        "서울": {"nx": 61, "ny": 125},
        "부산": {"nx": 98, "ny": 76},
        "인천": {"nx": 55, "ny": 124},
        "대구": {"nx": 89, "ny": 90},
        "광주": {"nx": 58, "ny": 74},
        "대전": {"nx": 67, "ny": 100},
        "울산": {"nx": 102, "ny": 84},
        "세종": {"nx": 66, "ny": 103},
        "경기": {"nx": 60, "ny": 120},
        "강원": {"nx": 73, "ny": 134},
        "충북": {"nx": 69, "ny": 107},
        "충남": {"nx": 68, "ny": 100},
        "전북": {"nx": 63, "ny": 89},
        "전남": {"nx": 51, "ny": 67},
        "경북": {"nx": 87, "ny": 106},
        "경남": {"nx": 91, "ny": 77},
        "제주": {"nx": 52, "ny": 38},
    }

    url = 'http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst'
    my_key = os.getenv('WEATHER_API_KEY')

    for region_name, coords in REGION_COORDS.items():
        print(f"👉 [{region_name}] 스케줄러가 날씨 수집 중...")
        
        params = {
            'serviceKey': my_key,
            'pageNo': '1',
            'numOfRows': '100',
            'dataType': 'JSON',
            'base_date': today_str,  # 👈 핵심! 고정 날짜 대신 오늘 날짜(today_str) 투입!
            'base_time': '0500',
            'nx': coords['nx'],
            'ny': coords['ny']
        }
        
        # 기상청 찌르기
        response = requests.get(url, params=params)
        data = response.json()
        
       
        
        # 1. 기상청에서 응답을 제대로 줬는지(resultCode == '00') 확인
        # ----------------------------------------------------
        if data.get('response') and data['response'].get('header', {}).get('resultCode') == '00':
            items = data['response']['body']['items']['item']
            
            tmp = 0  
            pop = 0  
            
            # 💡 [수정됨] 기상청 데이터 중 '오후 2시(1400)' 예보만 정확히 저격합니다!
            for item in items:
                # category가 TMP(온도)이면서, 동시에 fcstTime(예보시간)이 '1400'(오후 2시)인 것만!
                if item['category'] == 'TMP' and item['fcstTime'] == '1400':
                    tmp = float(item['fcstValue'])
                # 강수확률은 일단 그대로 둡니다 (또는 필요하면 얘도 1400으로 맞출 수 있습니다)
                elif item['category'] == 'POP' and item['fcstTime'] == '1400':
                    pop = float(item['fcstValue'])
                    
            # 3. 장고 DB (Weather 모델)에 예쁘게 저장하기!
            Weather.objects.update_or_create(
                region=region_name,
                base_date=today_str,
                base_time='0500', 
                defaults={
                    'temperature': tmp,
                    'precipitation': pop
                }
            )
            print(f"   ✔️ {region_name} (낮 2시 온도: {tmp}도, 강수확률: {pop}%) 저장 완료!")
        # ----------------------------------------------------
            
        else:
            print(f"   ❌ {region_name} 날씨 불러오기 실패 (API 에러)")
            
       
        # ----------------------------------------------------
        # ----------------------------------------------------

    print("✅ 오늘자 날씨 자동 저장 완료!")

def start():
    scheduler = BackgroundScheduler()
    scheduler.add_jobstore(DjangoJobStore(), "default")
    
    # 매일 새벽 6시 00분에 실행!
    scheduler.add_job(update_weather_job, 'cron', hour=6, minute=0, id="weather_update", replace_existing=True)
    
    scheduler.start()