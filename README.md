# CAPD_SOLO

복막투석 환자의 일일 기록과 의료진의 환자 관리를 연결하는 React 웹 애플리케이션입니다. 환자는 투석 기록·건강 문진·증상을 남기고, 의사는 환자별 기록과 차트, AI 보고서, 문진 및 진료 예약을 확인할 수 있습니다.

[배포 주소](https://capd-mu.vercel.app) · [API 경로 정의](src/api/endpoints.js)

## 주요 기능

| 구분 | 기능 |
| --- | --- |
| 공통 | 환자·의사별 로그인과 회원가입 화면, 역할에 따른 페이지 접근 제어 |
| 환자 | 투석액 혼탁 여부, 소변 횟수, 체중, 혈압, 공복혈당, 메모 기록 |
| 투석 교환 기록 | 교환 시각, 농도, 주입량·배액량 입력, 초여과량 계산, 임시 저장 및 제출 |
| 환자 지원 | 날짜별 기록 조회, 건강 문진 응답, 증상 도우미, 진료 일정 조회 |
| 의료진 | 환자 목록·검색, 환자 상세 정보, 기록 로그 및 수치 변화 차트 |
| 분석·문진 | AI 보고서 생성 요청·조회, 이상치 분석 결과, 보고서 복사 및 브라우저 인쇄/PDF 저장, 문진 생성·검토 |
| 진료 관리 | 예약 생성·조회, 환자·의사 마이페이지 |

이 저장소는 프런트엔드입니다. 실제 인증·AI 분석·데이터 저장 서버는 포함하지 않으며, 화면 확인을 위한 모의 API와 합성 데이터가 함께 들어 있습니다.

## 기술 스택

- React 19, JavaScript, Vite 7
- React Router 7: 역할별 라우팅
- Zustand 5: 로그인 세션과 선택 환자 상태
- Axios: API 요청, 인증 토큰 처리
- Recharts 3: 환자 기록 차트
- Tailwind CSS 4, ESLint 9

## 시작하기

Node.js와 npm이 필요합니다. 정확한 의존성 버전은 [package-lock.json](package-lock.json)을 기준으로 설치합니다.

```bash
git clone https://github.com/BaeDaeng/CAPD_SOLO.git
cd CAPD_SOLO
npm ci
```

루트에 `.env.local`을 만들고 모의 API 사용 여부를 명시합니다.

```dotenv
VITE_USE_MOCK_API=true
```

```bash
npm run dev
```

터미널에 표시된 개발 주소로 접속합니다. 기본 설정 포트는 `5173`입니다.

### 모의 데이터로 둘러보기

[모의 API](src/api/mockApi.js)는 `public/mock-data/`의 합성 환자·기록 데이터를 읽습니다.

| 역할 | 로그인 입력 | 모의 API 전용 비밀번호 |
| --- | --- | --- |
| 환자 | `patient001` ~ `patient010` | `c*123456789` |
| 의사 | 의사번호 `123456` | `c*123456789` |

위 값은 저장소에 정의된 데모 계정입니다. 모의 기록 변경, 문진 응답, 채팅 이력 등은 브라우저 localStorage에 보관됩니다. 모의 응답과 실제 서버의 동작 범위는 다르며, 회원가입·메일 인증 등 실제 서비스 연동은 별도 백엔드가 필요합니다.

### 실제 API 연결

`.env.local`을 다음과 같이 바꾸고 개발 서버를 다시 시작합니다.

```dotenv
VITE_USE_MOCK_API=false
VITE_API_BASE_URL=https://your-api.example.com
```

| 변수 | 동작 |
| --- | --- |
| `VITE_USE_MOCK_API` | 문자열 `false`일 때만 실제 API 호출. 그 외에는 모의 API 사용 |
| `VITE_API_BASE_URL` | 실제 API 기준 URL. 미설정 시 코드의 기본값은 `https://api.capd.site` |

API 계약은 [endpoints.js](src/api/endpoints.js), 요청 함수는 [apiClient.js](src/api/apiClient.js), 응답 변환은 [adapters.js](src/api/adapters.js)를 확인합니다. 실제 서버는 프런트엔드 출처에 대한 CORS 및 인증 쿠키 설정이 필요합니다. 클라이언트는 Bearer 액세스 토큰과 `withCredentials`를 사용하고, 401/403 응답 시 역할별 갱신 API로 토큰을 갱신한 뒤 한 번 재시도합니다.

## 주요 경로

| 경로 | 화면 |
| --- | --- |
| `/login` | 로그인 |
| `/register/patient`, `/register/doctor` | 역할별 회원가입 |
| `/patient` | 환자 홈 |
| `/patient/record`, `/patient/record_list` | 일일 기록 작성·목록 |
| `/patient/survey`, `/patient/chat`, `/patient/schedule` | 문진·증상 도우미·일정 |
| `/doctor` | 의료진 홈 |
| `/doctor/:id` | 환자 상세 |
| `/doctor/:id/charts`, `/doctor/:id/logs`, `/doctor/:id/ai_report` | 차트·기록·보고서 |
| `/doctor/appointments/new`, `/doctor/appointments/check` | 예약 생성·확인 |

전체 경로는 [App.jsx](src/App.jsx)에 정의되어 있습니다.

## 프로젝트 구조

```text
src/
├── api/          # API 계약, Axios 클라이언트, 응답 변환, 모의 API
├── components/   # 공통 UI
├── hooks/        # 데이터 조회 등 재사용 훅
├── layouts/      # 환자·의사 레이아웃
├── pages/        # 인증 및 역할별 화면
├── store/        # Zustand 세션 상태
└── utils/        # 날짜·분석 등 보조 함수
public/mock-data/ # 합성 환자·투석 기록
vercel.json      # SPA 경로 재작성 설정
```

## 개발 명령어와 배포

| 명령어 | 용도 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run build` | `dist/`에 프로덕션 빌드 |
| `npm run preview` | 빌드 결과 로컬 확인 |
| `npm run lint` | ESLint 검사 |

별도 자동 테스트 스크립트는 현재 등록되어 있지 않습니다. 정적 호스팅 시 빌드 명령은 `npm run build`, 출력 디렉터리는 `dist`입니다. 직접 URL 접근과 새로고침이 동작하도록 SPA fallback을 설정해야 하며, Vercel 설정은 저장소에 포함되어 있습니다. 환경 변수를 변경하면 다시 빌드해야 합니다.

## 참고

- 데모 데이터의 기준 연도는 2025년입니다. 과거 기록을 확인할 때 날짜 범위를 맞춰 주세요.
- AI 보고서·증상 도우미의 실제 분석은 연결한 서버 구현에 의존합니다. 모의 모드에서는 준비된 데이터와 규칙 기반 응답을 사용합니다.
- 별도 라이선스 파일은 현재 저장소에 없습니다.
