import os
import django
import requests
import json

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "mysite.settings")
django.setup()

from inventory.models import Weather 

# ⭐️ 전국 주요 광역시/도 기상청 격자 좌표 완벽 세팅!
REGION_COORDS = {
    "서울": {"nx": 61, "ny": 125},
    "부산": {"nx": 98, "ny": 76},
    "인천": {"nx": 55, "ny": 124},
    "대구": {"nx": 89, "ny": 90},
    "광주": {"nx": 58, "ny": 74},
    "대전": {"nx": 67, "ny": 100},
    "울산": {"nx": 102, "ny": 84},
    "세종": {"nx": 66, "ny": 103},
    "경기": {"nx": 60, "ny": 120}, # 수원 기준
    "강원": {"nx": 73, "ny": 134}, # 춘천 기준
    "충북": {"nx": 69, "ny": 107}, # 청주 기준
    "충남": {"nx": 68, "ny": 100}, # 홍성 기준
    "전북": {"nx": 63, "ny": 89},  # 전주 기준
    "전남": {"nx": 51, "ny": 67},  # 무안 기준
    "경북": {"nx": 87, "ny": 106}, # 안동 기준
    "경남": {"nx": 91, "ny": 77},  # 창원 기준
    "제주": {"nx": 52, "ny": 38},  # 제주 기준
}

url = 'http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst'
my_key = 'key here' 



print("☁️ 전국 주요 지역 기상청 데이터를 싹쓸이해 옵니다...")

# ⭐️ 번역기(REGION_COORDS)에 있는 지역들을 하나씩 꺼내서 반복!
for region_name, coords in REGION_COORDS.items():
    print(f"\n👉 [{region_name}] 날씨 수집 중... (nx:{coords['nx']}, ny:{coords['ny']})")
    
    params = {
        'serviceKey': my_key,
        'pageNo': '1',
        'numOfRows': '100',
        'dataType': 'JSON',
        'base_date': '20260406',  # 오늘 날짜
        'base_time': '0500',      # 예보 시간
        'nx': coords['nx'],       # 번역기에서 가져온 X 좌표
        'ny': coords['ny']        # 번역기에서 가져온 Y 좌표
    }

    response = requests.get(url, params=params)

    if response.status_code == 200:
        data = json.loads(response.text)
        items = data['response']['body']['items']['item']
        
        weather_dict = {}
        
        for item in items:
            date = item['fcstDate']
            time = item['fcstTime']
            category = item['category']
            value = item['fcstValue']
            
            key = f"{date}_{time}"
            if key not in weather_dict:
                weather_dict[key] = {'base_date': date, 'base_time': time, 'tmp': None, 'rn1': 0.0}
                
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

        save_count = 0
        for key, val in weather_dict.items():
            if val['tmp'] is not None:
                # ⭐️ DB에 저장할 때 region(지역) 이름표도 같이 붙여서 저장!
                Weather.objects.update_or_create(
                    base_date=val['base_date'],
                    base_time=val['base_time'],
                    region=region_name, # "서울" 또는 "부산"
                    defaults={
                        'temperature': val['tmp'],
                        'precipitation': val['rn1']
                    }
                )
                save_count += 1
        print(f"✅ [{region_name}] 데이터 {save_count}개 저장 완료!")
        
    else:
        print(f"❌ [{region_name}] 통신 실패: {response.status_code}")

print("\n🎉 모든 지역의 날씨 업데이트가 끝났습니다!")