import os
import django
import random
from datetime import timedelta
from django.utils import timezone

# 설정 모듈 지정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
django.setup()

from inventory.models import Product, InventoryBatch

def create_dummy_data():
    categories = ['원두', '우유', '시럽', '파우더', '소모품', '디저트/베이커리']
    
    # 더미 품목명 (다양하게 50개 이상 구성)
    items = [
        ('콜롬비아 수프리모', '원두', 15000), ('에티오피아 예가체프', '원두', 18000), ('브라질 산토스', '원두', 13000),
        ('과테말라 안티구아', '원두', 16000), ('케냐 AA', '원두', 20000), ('디카페인 원두', '원두', 22000),
        ('블렌드 A (산미)', '원두', 14000), ('블렌드 B (고소)', '원두', 14000),
        
        ('서울우유 1L', '우유', 2800), ('매일우유 1L', '우유', 2700), ('오트밀크 1L', '우유', 4500),
        ('아몬드밀크 1L', '우유', 4000), ('두유 1L', '우유', 3000), ('락토프리 우유 1L', '우유', 3500),
        
        ('바닐라 시럽 1L', '시럽', 12000), ('헤이즐넛 시럽 1L', '시럽', 12000), ('카라멜 시럽 1L', '시럽', 12500),
        ('초코 소스 1L', '시럽', 14000), ('화이트초코 소스 1L', '시럽', 15000), ('딸기 시럽 1L', '시럽', 11000),
        ('자몽 시럽 1L', '시럽', 13000), ('청포도 시럽 1L', '시럽', 13000), ('애플망고 베이스 1L', '시럽', 16000),
        
        ('녹차 파우더 500g', '파우더', 18000), ('밀크티 파우더 500g', '파우더', 17000), ('초코 파우더 500g', '파우더', 15000),
        ('요거트 파우더 500g', '파우더', 16000), ('흑임자 파우더 500g', '파우더', 19000), ('민트초코 파우더 500g', '파우더', 18500),
        
        ('테이크아웃 컵 14oz (1000개)', '소모품', 45000), ('테이크아웃 컵 16oz (1000개)', '소모품', 48000),
        ('뜨거운 음료용 컵 (1000개)', '소모품', 50000), ('컵 뚜껑 돔형 (1000개)', '소모품', 20000),
        ('컵 뚜껑 평면형 (1000개)', '소모품', 18000), ('종이 홀더 (1000개)', '소모품', 30000),
        ('플라스틱 빨대 (5000개)', '소모품', 25000), ('종이 빨대 (5000개)', '소모품', 45000),
        ('냅킨 (1박스)', '소모품', 15000), ('포장용 비닐 캐리어 (1000개)', '소모품', 35000),
        
        ('치즈 케이크', '디저트/베이커리', 4500), ('초코 무스 케이크', '디저트/베이커리', 4800), ('당근 케이크', '디저트/베이커리', 5000),
        ('티라미수', '디저트/베이커리', 5500), ('마카롱 (바닐라)', '디저트/베이커리', 2000), ('마카롱 (초코)', '디저트/베이커리', 2000),
        ('마카롱 (딸기)', '디저트/베이커리', 2000), ('크로플 생지', '디저트/베이커리', 1500), ('베이글 (플레인)', '디저트/베이커리', 2500),
        ('베이글 (어니언)', '디저트/베이커리', 2800), ('스콘 (플레인)', '디저트/베이커리', 3000), ('크림치즈 포션', '디저트/베이커리', 1000)
    ]

    print("기존 데이터를 초기화합니다...")
    InventoryBatch.objects.all().delete()
    Product.objects.all().delete()
    
    print("50개의 품목 및 재고 데이터를 생성합니다...")
    for idx, (name, category, price) in enumerate(items, 1):
        product = Product.objects.create(
            code=f"P{idx:03d}",
            name=name,
            category=category,
            selling_price=price
        )
        
        # 품목에 따라 유통기한 및 재고 수량 무작위 설정
        if category == '디저트/베이커리':
            exp_days = random.randint(1, 5)
            qty = random.randint(5, 30)
        elif category == '우유':
            exp_days = random.randint(3, 14)
            qty = random.randint(10, 50)
        elif category == '소모품':
            exp_days = 365
            qty = random.randint(1, 10) # 박스 단위 등
        else:
            exp_days = random.randint(30, 365)
            qty = random.randint(2, 20)
            
        # 재고 부족 상황(0~5개)을 가끔 연출
        if random.random() > 0.8:
            qty = random.randint(0, 3)

        InventoryBatch.objects.create(
            product=product,
            received_date=timezone.now().date() - timedelta(days=random.randint(0, 10)),
            expiration_date=timezone.now().date() + timedelta(days=exp_days),
            current_qty=qty,
            status='NORMAL' if qty > 0 else 'EMPTY'
        )
        
    print(f"완료! 총 {len(items)}개의 더미 데이터가 생성되었습니다.")

if __name__ == '__main__':
    create_dummy_data()
