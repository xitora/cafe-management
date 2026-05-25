import os
import django
import random
from datetime import datetime, timedelta

# 장고 환경 세팅 (mysite 부분은 찬우님 프로젝트 이름에 맞게!)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "mysite.settings")
django.setup()

from inventory.models import SalesHistory

# --- ☕️ 카페 메뉴 및 기본 가격 세팅 ---
CAFE_MENU = {
    '아이스 아메리카노': {'category': '콜드브루/아이스', 'price': 4500},
    '애플망고 스무디': {'category': '스무디/빙수', 'price': 6500},
    '핫 아메리카노': {'category': '따뜻한 커피', 'price': 4000},
    '고구마 라떼': {'category': '논커피/티', 'price': 5500},
    '바닐라 라떼': {'category': '달콤한 커피', 'price': 5000},
    '크루아상': {'category': '베이커리/디저트', 'price': 3500},
}

def create_dummy_data():
    print("🚀 카페 판매 데이터 생성을 시작합니다... (기존 데이터 초기화 중)")
    SalesHistory.objects.all().delete() # 기존 테스트 데이터 싹 지우기 깔끔하게!

    # 오늘 기준으로 7일 전부터 오늘까지 (총 8일) 데이터 생성
    start_date = datetime.now() - timedelta(days=7)
    total_days = 8 # 7일 전 ~ 오늘

    records_to_create = []

    for i in range(total_days):
        current_date = start_date + timedelta(days=i)
        date_str = current_date.strftime('%Y%m%d')
        month = current_date.month

        # 🌤️ 가짜 날씨 시뮬레이션 (AI가 학습할 규칙!)
        is_summer = month in [6, 7, 8, 9]
        is_winter = month in [11, 12, 1, 2]
        is_raining = random.random() < 0.2 # 20% 확률로 비가 옴

        for product_name, info in CAFE_MENU.items():
            base_qty = random.randint(10, 30) # 기본적으로 10~30개는 팔림
            category = info['category']
            
            # 🧠 AI 학습용 가중치 부여 (핵심!)
            if is_summer and category in ['콜드브루/아이스', '스무디/빙수']:
                base_qty += random.randint(30, 70) # 여름엔 아이스/빙수 대박!
            
            if is_winter and category in ['따뜻한 커피', '논커피/티']:
                base_qty += random.randint(20, 50) # 겨울엔 따뜻한 음료 짱!
                
            if is_raining and category in ['달콤한 커피', '베이커리/디저트']:
                base_qty += random.randint(15, 40) # 비 올 땐 디저트 세트 떡상!

            # 최종 수량 및 가격 계산
            final_qty = base_qty
            total_price = final_qty * info['price']

            # DB에 저장할 준비
            records_to_create.append(
                SalesHistory(
                    sale_date=date_str,
                    region='서울', # 캡스톤 시연용으로 일단 서울로 통일
                    product_name=product_name,
                    category=category,
                    quantity=final_qty,
                    total_price=total_price
                )
            )

    # 📦 한 번에 DB에 밀어 넣기 (속도 엄청 빠름!)
    SalesHistory.objects.bulk_create(records_to_create)
    print(f"🎉 성공! 총 {len(records_to_create)}개의 카페 판매 기록이 DB에 생성되었습니다!")

if __name__ == '__main__':
    create_dummy_data()