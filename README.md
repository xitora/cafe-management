# AI 스마트 카페 관리 시스템 (Cafe Management System)

## 설명
데이터 기반의 수요 예측을 통해 재고 및 폐기량을 효율적으로 관리하고 종합 리포트를 제공하는 인공지능 기반 스마트 카페 관리 플랫폼입니다.
머신러닝 예측 모델을 통해 날씨, 요일, 등 외부 요인을 분석하여 향후 메뉴별 판매량을 예측하고, 이를 바탕으로 한 발주 관리 및 폐기 데이터 모니터링을 시각화된 대시보드로 제공합니다.

---

## 기술 스택

### Frontend
- **Framework:** Next.js (React)
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui, Lucide React
- **Data Visualization:** Recharts

### Backend
- **Framework:** Python, Django, Django REST Framework (DRF)
- **Database:** SQLite3 (기본 설정)

---

## 시작하기

### 1. 사전 준비
이 프로젝트를 로컬 환경에서 실행하려면 다음 소프트웨어가 설치되어 있어야 합니다.
- **Node.js** (v18 이상 권장)
- **Python** (v3.10 이상 권장)

### 2. 패키지 설치

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

### 3. 환경 변수 설정
필요한 경우 프로젝트 루트에 프론트엔드용 `.env.local` 파일을 생성하여 API 서버 주소 등을 설정할 수 있습니다.
```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

### 4. 실행 방법

**백엔드 서버 실행**
```bash
cd backend
# 데이터베이스 마이그레이션 적용
python manage.py migrate
# 더미 데이터 생성 (선택 사항)
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

## 접속 주소 및 API 엔드포인트

### 🌐 로컬 접속 주소
- **프론트엔드 (웹 UI):** [http://localhost:3000](http://localhost:3000)
- **백엔드 (API Server):** [http://127.0.0.1:8000](http://127.0.0.1:8000)

### 🔌 주요 백엔드 API 엔드포인트
- `GET /api/inventory/` - 전체 재고 및 품목 현황 조회
- `GET /api/waste/` - 폐기 내역 목록 및 통계 조회
- `GET /api/predict/` - AI 기반 메뉴별 예상 판매 수요 및 권장 발주량 조회
- `GET /api/reports/` - 매출 추이, 인기 상품, 카테고리 비율 등 대시보드 데이터 조회
- `GET /api/reports/download` (Next.js) - 선택 기간에 맞춘 통합 더미 데이터 CSV 다운로드
