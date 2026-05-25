from django.contrib import admin
from django.urls import path, include  # 🌟 include 라는 마법의 단어가 추가되었습니다!
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path('admin/', admin.site.urls),                     # 기존에 있던 관리자 페이지 주소
    path('api/', include('inventory.urls')),             # 🌟 새로 추가된 API 입구!

    # ==========================================
    # 🚀 Swagger 전자 메뉴판 주소 추가!
    # ==========================================
    # 1. API 설계도면(JSON)을 다운받는 보이지 않는 주소
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    # 2. ⭐️ 프론트엔드가 실제로 접속해서 볼 예쁜 웹페이지 주소
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]