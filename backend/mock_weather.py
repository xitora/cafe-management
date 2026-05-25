import os
import django
import datetime

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "mysite.settings")
django.setup()

from inventory.models import Weather 

def days_ago(n):
    return (datetime.date.today() - datetime.timedelta(days=n)).strftime("%Y%m%d")

regions = ["서울", "부산", "인천", "대구", "광주", "대전", "울산", "세종", "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"]

for region in regions:
    # Today
    Weather.objects.update_or_create(
        base_date=days_ago(0),
        base_time="0500",
        region=region,
        defaults={
            'temperature': 20.0,
            'precipitation': 0.0
        }
    )
    # Tomorrow
    Weather.objects.update_or_create(
        base_date=days_ago(-1),
        base_time="0500",
        region=region,
        defaults={
            'temperature': 25.0, # +5 degrees compared to today
            'precipitation': 0.0
        }
    )

print("Mock weather data inserted!")
