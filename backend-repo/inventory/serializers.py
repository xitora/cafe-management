from rest_framework import serializers
from .models import Product, InventoryBatch, SalesHistory, ForecastResult, Weather, WasteHistory, OrderRecommendation


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = '__all__'

class InventorySerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryBatch
        fields = '__all__'

class SalesHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SalesHistory
        fields = '__all__'

# 🌟 번역기 이름도 ForecastResultSerializer로 맞춤!
class ForecastResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = ForecastResult
        fields = '__all__'

class WasteHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = WasteHistory
        fields = '__all__'

class OrderRecommendationSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderRecommendation
        fields = '__all__'
class WeatherSerializer(serializers.ModelSerializer):
    class Meta:
        model = Weather
        # 프론트엔드에 보내줄 데이터 항목들만 쏙쏙 고르기
        fields = ['region', 'base_date', 'base_time', 'temperature', 'precipitation']