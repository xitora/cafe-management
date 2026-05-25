#  카페 수요 예측 API 서버 (Capstone Project)

본 프로젝트는 인공지능(AI) 모델을 활용하여 카페의 향후 수요를 예측하고, 적정 발주량을 계산하여 프론트엔드에 전달하는 Django 기반의 RESTful API 서버입니다.

## 🛠 Tech Stack
- **Framework:** Django 6.0.3, Django REST Framework (DRF)
- **Database:** MySQL
- **AI & Data:** scikit-learn, pandas, numpy
- **Documentation:** drf-spectacular (Swagger UI)
- **Others:** django-cors-headers, django-apscheduler, python-dotenv

---

##  시작하기 (Getting Started)

프론트엔드 및 로컬 환경에서 백엔드 서버를 구동하기 위한 가이드입니다.

### 1. 사전 준비 (Prerequisites)
- Python 3.9 이상 설치
- MySQL 설치 및 로컬 데이터베이스 생성
  CREATE DATABASE capstone_db CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

### 2. 패키지 설치 (Installation)
가상환경(venv)을 활성화한 후, 필요한 패키지를 설치합니다.
pip install -r requirements.txt

### 3. 환경 변수 설정 (.env)
보안을 위해 비밀번호 및 API 키는 깃허브에 공유되지 않습니다.
프로젝트 최상단(manage.py와 같은 위치)에 `.env` 파일을 생성하고 아래 내용을 채워주세요.

SECRET_KEY=여기에_공유받은_시크릿키를_입력하세요
WEATHER_API_KEY=여기에_공유받은_날씨API키를_입력하세요
DB_PASSWORD=본인로컬_MySQL_비밀번호입력

### 4. 데이터베이스 연동 및 서버 실행
python manage.py runserver

---

## 📖 API 문서 (Swagger)

서버 실행 후, 아래 주소로 접속하면 테스트 가능한 API 명세서(Swagger UI)를 확인할 수 있습니다.
- **Swagger URL:** http://127.0.0.1:8000/api/docs/

### 💡 주요 API 엔드포인트
- POST /api/forecasts/predict/ : AI 모델을 구동하여 품목별 수요 예측 및 추천 발주량(JSON)을 반환합니다.