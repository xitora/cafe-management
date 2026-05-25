import requests
import json

print("☁️ 기상청 서버에 접근 중입니다...")

# 1. 단기예보 API 주소
url = 'http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst'

# 2. 발급받은 인증키 넣기 (⭐️ 매우 중요: 반드시 'Decoding' 키를 넣으세요!)
my_key = '4a67a32db6de16143ef4eb887cccdd2df99b7f84e5de2740c87d0fb3b2250c63'

# 3. 데이터 요청 규칙 설정 (오늘 날짜 20260406 기준)
params = {
    'serviceKey': my_key,
    'pageNo': '1',
    'numOfRows': '10',        # 일단 10개만 가져와보기
    'dataType': 'JSON',       # 무조건 JSON!
    'base_date': '20260406',  # 오늘 날짜
    'base_time': '0500',      # 새벽 5시 예보 기준
    'nx': '61',               # 강남구 X 좌표
    'ny': '125'               # 강남구 Y 좌표
}

# 4. 기상청에 데이터 요청 날리기
response = requests.get(url, params=params)

# 5. 결과물 예쁘게 출력하기
if response.status_code == 200:
    try:
        data = json.loads(response.text)
        print("\n✅ 통신 성공! 도착한 데이터 생얼굴입니다:\n")
        print(json.dumps(data, indent=4, ensure_ascii=False))
    except json.JSONDecodeError:
        print("\n❌ 에러: JSON 형태가 아닙니다. 키 에러일 확률이 높습니다.")
        print(response.text)
else:
    print(f"\n❌ 서버 에러 발생: {response.status_code}")