# ☕ AI 스마트 카페 관리 시스템

<div align="center">
  <a href="https://nextjs.org/" target="_blank"><img src="https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" /></a>
  <a href="https://www.djangoproject.com/" target="_blank"><img src="https://img.shields.io/badge/Django-092E20?style=for-the-badge&logo=django&logoColor=white" alt="Django" /></a>
  <a href="https://tailwindcss.com/" target="_blank"><img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" /></a>
  <a href="https://www.sqlite.org/" target="_blank"><img src="https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite" /></a>
</div>

<br />

## 📖 프로젝트 설명

**데이터 기반의 수요 예측**을 통해 재고 및 폐기량을 효율적으로 관리하고 종합 리포트를 제공하는 **인공지능 기반 스마트 카페 관리 플랫폼**입니다.   
머신러닝 예측 모델을 바탕으로 날씨, 요일, 공휴일 등의 외부 요인을 분석하여 향후 메뉴별 판매량을 예측하고, 이를 바탕으로 발주 권장량 산출 및 폐기 데이터를 시각화된 대시보드로 제공하여 매장 운영의 효율성을 극대화합니다.

---

## 🛠 기술 스택

### 🎨 프론트엔드
- **프레임워크:** Next.js (React)
- **스타일링:** Tailwind CSS
- **UI 컴포넌트:** shadcn/ui, Lucide React
- **데이터 시각화:** Recharts

### ⚙️ 백엔드
- **프레임워크:** Python, Django, Django REST Framework (DRF)
- **인공지능/머신러닝:** scikit-learn, pandas, numpy (수요 예측 알고리즘 적용)
- **데이터베이스:** SQLite3 (기본 설정)

---

## 🚀 시작하기

프로젝트를 로컬 환경에서 실행하는 방법입니다.

### 1️⃣ 사전 준비
이 프로젝트를 실행하려면 시스템에 다음 소프트웨어가 설치되어 있어야 합니다.
- **Node.js** (v18 이상 권장)
- **Python** (v3.10 이상 권장)

### 2️⃣ 패키지 설치

**프론트엔드 종속성 설치**
```bash
# 프로젝트 루트 디렉토리에서 실행
npm install
```

**백엔드 종속성 설치**
```bash
# backend 디렉토리로 이동하여 가상환경 생성 및 패키지 설치
cd backend
python -m venv venv

# 가상환경 활성화 (Windows)
.\venv\Scripts\activate
# 가상환경 활성화 (macOS/Linux)
# source venv/bin/activate

pip install -r requirements.txt
```

### 3️⃣ 환경 변수 설정
프로젝트 루트 경로에 프론트엔드용 `.env.local` 파일을 생성하여 API 서버 주소 등을 설정합니다. (기본적으로 백엔드는 `localhost:8000`을 향합니다.)
```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

### 4️⃣ 실행 방법

**백엔드 서버 실행**
```bash
cd backend
# 데이터베이스 마이그레이션 적용
python manage.py migrate

# (선택 사항) 테스트용 더미 데이터 생성
python seed_inventory.py
python make_dummy.py

# 서버 실행
python manage.py runserver
```

**프론트엔드 개발 서버 실행**
```bash
# 새로운 터미널을 열고 프로젝트 루트에서 실행
npm run dev
```

---

## 🔗 접속 주소 및 주요 엔드포인트

### 🌐 로컬 접속 주소
- **🖥️ 프론트엔드 (웹 UI):** [http://localhost:3000](http://localhost:3000)
- **⚙️ 백엔드 (API Server):** [http://127.0.0.1:8000](http://127.0.0.1:8000)

### 🔌 주요 백엔드 API 엔드포인트 (Click to open)
백엔드 서버 구동 후, 아래 링크를 클릭하시면 해당 API의 응답을 브라우저에서 바로 확인할 수 있습니다.

- [GET `/api/inventory/`](http://127.0.0.1:8000/api/inventory/) : 전체 재고 및 품목 현황 리스트 조회
- [GET `/api/waste/`](http://127.0.0.1:8000/api/waste/) : 폐기 내역 목록 및 통계 데이터 조회
- [GET `/api/forecasts/predict/`](http://127.0.0.1:8000/api/forecasts/predict/) : AI 기반 메뉴별 예상 판매 수요 및 권장 발주량 예측값 조회
- [GET `/api/reports/`](http://127.0.0.1:8000/api/reports/) : 매출 추이, 인기 상품 순위, 카테고리 비율 등 대시보드 통계 조회

*(추가로, Next.js 자체 API를 활용한 통합 더미 CSV 다운로드 라우트 `GET /api/reports/download`도 포함되어 있습니다.)*

---

## 🏆 출처 및 크레딧 (Credits)

이 프로젝트의 백엔드 및 AI 모델은 다음 저장소를 참고 및 기반으로 하여 작성되었습니다.

- **백엔드 (Backend):** [Gwonchanwoo/capstone-backend](https://github.com/Gwonchanwoo/capstone-backend)
- **AI 모델 (Model):** [Akamyoyel/capstone](https://github.com/Akamyoyel/capstone)
