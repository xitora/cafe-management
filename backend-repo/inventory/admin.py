from django.contrib import admin
from .models import (
    Product, Supplier, SupplierPrice, InventoryBatch, 
    SalesHistory, WasteHistory, ExternalFactor, 
    ForecastResult, OrderRecommendation
)

# 캡스톤 프로젝트 관리자 페이지를 보기 편하게 커스텀합니다.

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'category', 'selling_price') # 목록에서 보여줄 기준
    search_fields = ('code', 'name') # 검색 기능 추가
    list_filter = ('category',) # 우측 필터 기능 추가

@admin.register(InventoryBatch)
class InventoryBatchAdmin(admin.ModelAdmin):
    list_display = ('product', 'received_date', 'expiration_date', 'current_qty', 'status')
    list_filter = ('status', 'expiration_date')
    search_fields = ('product__name',)

@admin.register(SalesHistory)
class SalesHistoryAdmin(admin.ModelAdmin):
    # 1. 목록에서 엑셀 표처럼 쫙 보여줄 기둥들 (새로운 AI 맞춤형 필드로 교체!)
    list_display = ('sale_date', 'region', 'category', 'product_name', 'quantity', 'total_price')
    
    # 2. 우측 필터 기능 (날짜별, 지역별, 카테고리별로 클릭해서 모아보기 엄청 편해집니다)
    list_filter = ('sale_date', 'region', 'category')
    
    # 3. 검색 기능 (상품명이나 카테고리로 빠르게 검색!)
    search_fields = ('product_name', 'category')


@admin.register(WasteHistory)
class WasteHistoryAdmin(admin.ModelAdmin):
    list_display = ('product', 'waste_datetime', 'quantity', 'reason')
    list_filter = ('reason', 'waste_datetime')

@admin.register(ExternalFactor)
class ExternalFactorAdmin(admin.ModelAdmin):
    list_display = ('date', 'temperature', 'precipitation', 'is_holiday', 'has_promotion', 'local_event')
    list_filter = ('is_holiday', 'has_promotion')

@admin.register(ForecastResult)
class ForecastResultAdmin(admin.ModelAdmin):
    list_display = ('target_date', 'product', 'predicted_qty', 'forecast_period', 'created_at')
    list_filter = ('forecast_period', 'target_date')

@admin.register(OrderRecommendation)
class OrderRecommendationAdmin(admin.ModelAdmin):
    list_display = ('product', 'recommended_qty', 'priority', 'estimated_cost', 'created_at')
    list_filter = ('priority',)

# Supplier와 SupplierPrice는 기본 형태로 등록
admin.site.register(Supplier)
admin.site.register(SupplierPrice)


from django.contrib import admin
from .models import Weather # 본인의 환경에 맞게 import 하세요!

admin.site.register(Weather)