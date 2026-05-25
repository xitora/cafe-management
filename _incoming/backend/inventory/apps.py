from django.apps import AppConfig
# import joblib  👈 나중에 AI 파일 오면 주석 풀기!

class InventoryConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'inventory'
    
    # 🌟 AI 뇌가 상주할 빈 바구니(전역 변수)를 미리 만들어둡니다.
    ai_model = None 

    def ready(self):
        # ==========================================
        # 1. 기존 코드: 장고가 준비되면 스케줄러 시작! (유지)
        # ==========================================
        # from . import operator
        #operator.start()
        print("🕒 기상청 날씨 자동수집 스케줄러 가동 완료!")

        # ==========================================
        # 2. 신규 코드: AI 모델 연동 대기
        # ==========================================
        print("🚀 Inventory 앱 로딩 완료. (AI 모델 연동 대기중...)")
        
        # [나중에 AI 모델 파일이 오면 아래 주석을 풀고 파일 경로만 맞추면 끝!]
        # try:
        #     self.ai_model = joblib.load('inventory/ml_models/sales_predict_model.pkl')
        #     print("✅ AI 뇌(모델) 장착 완료!")
        # except Exception as e:
        #     print("⚠️ AI 모델 파일을 찾을 수 없습니다:", e)