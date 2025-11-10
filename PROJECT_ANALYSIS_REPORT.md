# Troy Platform 프로젝트 분석 보고서

## 📋 프로젝트 개요

**프로젝트명**: Troy Platform  
**기술 스택**: Node.js + Express + Supabase + Vanilla JavaScript  
**아키텍처**: MPA (Multi-Page Application) + REST API  
**데이터베이스**: PostgreSQL (Supabase)

---

## 🏗️ 프로젝트 구조 분석

### 1. 폴더 구조

```
TroyFinal/
├── 📁 html/                    # 프론트엔드 페이지
│   ├── 📄 index.html           # 메인 페이지
│   ├── 📄 admin-dashboard.html # 관리자 대시보드
│   ├── 📄 agency-dashboard.html# 대행사 대시보드
│   ├── 📄 partner-dashboard.html# 파트너사 대시보드
│   ├── 📄 customer-dashboard.html# 고객사 대시보드
│   └── 📁 components/          # 재사용 가능한 컴포넌트
│       ├── 📄 payment-management.html
│       ├── 📄 notification-center.html
│       ├── 📄 schedule-management.html
│       └── ... (34개 컴포넌트)
├── 📁 js/                      # JavaScript 로직
│   ├── 📄 server.js            # Express 서버
│   ├── 📄 auth-api.js          # 인증 API
│   ├── 📄 supabase-client.js   # Supabase 클라이언트
│   ├── 📄 payment-management.js# 결제 관리
│   ├── 📄 notification-center.js# 알림 센터
│   └── 📁 components/          # 컴포넌트별 JS
│       ├── 📄 agency-schedule-management.js
│       ├── 📄 customer-schedule-management.js
│       ├── 📄 partner-schedule-management.js
│       └── ... (30개 컴포넌트)
├── 📁 css/                     # 스타일시트
│   ├── 📄 dashboard.css        # 공통 대시보드 스타일
│   ├── 📄 payment-management.css
│   ├── 📄 notification-center.css
│   └── ... (40개 CSS 파일)
├── 📁 routes/                  # API 라우트
│   ├── 📄 auth.js              # 인증 관련 API
│   └── 📄 admin.js             # 관리자 관련 API
├── 📁 config/                  # 설정 파일
│   └── 📄 supabase.js          # Supabase 설정
└── 📄 Supabase.sql            # 데이터베이스 스키마
```

### 2. 주요 페이지별 역할

- **관리자 대시보드**: 전체 시스템 관리, 결제 승인, 알림 관리
- **대행사 대시보드**: 캠페인 관리, 클라이언트 관리, 스케줄 관리
- **파트너사 대시보드**: 파트너십 관리, 정산 관리, 스케줄 관리
- **고객사 대시보드**: 캠페인 등록, 결제 내역, 스케줄 확인

---

## 🔗 데이터베이스 연동 상태 점검

### ✅ 연결된 기능들

| 기능                   | API 상태  | DB 테이블                                              | 비고               |
| ---------------------- | --------- | ------------------------------------------------------ | ------------------ |
| **사용자 인증**        | ✅ 연결됨 | `user_profiles`, `advertisers`, `agencies`, `partners` | Supabase Auth 사용 |
| **파트너사 결제 내역** | ✅ 연결됨 | `payments`                                             | Supabase 연동 완료 |
| **대행사 결제 내역**   | ✅ 연결됨 | `payments`                                             | Supabase 연동 완료 |
| **고객사 결제 내역**   | ✅ 연결됨 | `payments`                                             | Supabase 연동 완료 |
| **파트너십 상태 관리** | ✅ 연결됨 | `partners`, `partner_invite_codes`                     | Supabase 연동 완료 |

### ⚠️ Mock 데이터 사용 중인 기능들

| 기능                   | 현재 상태      | 문제점                          | 개선 필요                |
| ---------------------- | -------------- | ------------------------------- | ------------------------ |
| **결제 관리 (관리자)** | 🔴 Mock 데이터 | `mockPayments` 배열 사용        | Supabase 연동 필요       |
| **알림 센터**          | 🔴 Mock 데이터 | `getSampleNotifications()` 사용 | DB 연동 + 읽음 상태 관리 |
| **캠페인 진행률 추적** | 🔴 Mock 데이터 | `getSampleCampaigns()` 사용     | 실제 캠페인 데이터 연동  |
| **스케줄 관리**        | 🔴 Mock 데이터 | 모든 사용자 타입에서 Mock 사용  | 통합 스케줄 API 필요     |
| **고객 관리**          | 🔴 Mock 데이터 | `mockCustomers` 배열 사용       | 실제 고객 데이터 연동    |
| **파트너 관리**        | 🔴 Mock 데이터 | `mockPartners` 배열 사용        | 실제 파트너 데이터 연동  |

---

## 📊 데이터 흐름 분석

### 1. 사용자 인증 흐름

```
사용자 로그인 → Supabase Auth → JWT 토큰 발급 →
사용자 타입별 대시보드 로드 → 개인화된 데이터 표시
```

### 2. 캠페인 등록 흐름 (현재 문제점)

```
고객사 캠페인 등록 → localStorage 저장 →
❌ DB 저장 안됨 → ❌ 관리자 승인 프로세스 없음 →
❌ 알림 생성 안됨 → ❌ 스케줄 반영 안됨
```

### 3. 결제 처리 흐름 (부분적 문제)

```
결제 요청 → Mock 데이터로만 처리 →
❌ 실제 결제 시스템 연동 없음 →
❌ 관리자 승인 후 실제 상태 반영 안됨
```

### 4. 알림 시스템 흐름 (문제점)

```
이벤트 발생 → Mock 알림 생성 →
❌ DB 저장 안됨 → ❌ 실시간 알림 없음 →
❌ 읽음 상태 관리 안됨
```

---

## 🚨 주요 문제점 및 개선 필요 사항

### 1. 데이터베이스 연동 문제

#### 🔴 심각한 문제

- **결제 관리 시스템**: 관리자가 실제 결제를 승인할 수 없음
- **알림 시스템**: 읽음 상태가 DB에 저장되지 않음
- **캠페인 관리**: 등록된 캠페인이 실제 DB에 저장되지 않음

#### ⚠️ 중간 문제

- **스케줄 관리**: 모든 사용자 타입에서 Mock 데이터 사용
- **고객/파트너 관리**: 실제 데이터와 연동되지 않음

### 2. 데이터 일관성 문제

#### 프론트엔드-백엔드 불일치

```javascript
// 프론트엔드에서 사용하는 필드명
payment_status: "pending_approval";

// DB 스키마의 필드명 (추정)
status: "pending";
```

#### 상태 관리 문제

- 로컬스토리지와 DB 상태 동기화 안됨
- 새로고침 시 데이터 손실
- 실시간 업데이트 없음

### 3. API 구조 문제

#### 누락된 API 엔드포인트

```javascript
// 필요한 API들
POST /api/campaigns              // 캠페인 등록
GET  /api/campaigns              // 캠페인 목록 조회
PUT  /api/campaigns/:id/approve  // 캠페인 승인
POST /api/notifications          // 알림 생성
PUT  /api/notifications/:id/read // 알림 읽음 처리
GET  /api/schedules              // 스케줄 조회
POST /api/schedules              // 스케줄 생성
```

#### 현재 구현된 API

```javascript
// 실제 구현된 API들
POST /api/auth/login             // 로그인
POST /api/auth/register          // 회원가입
GET  /api/admin/notifications    // 알림 목록 (Mock)
PATCH /api/admin/notifications/:id/read // 알림 읽음 처리 (Mock)
```

---

## 🛠️ 개선 우선순위

### 1단계 (긴급) - 핵심 기능 DB 연동

- [ ] 결제 관리 시스템 Supabase 연동
- [ ] 알림 시스템 DB 연동 및 읽음 상태 관리
- [ ] 캠페인 등록/승인 프로세스 구현

### 2단계 (중요) - 데이터 일관성 확보

- [ ] 스케줄 관리 시스템 통합 API 구현
- [ ] 고객/파트너 관리 실제 데이터 연동
- [ ] 프론트엔드-백엔드 데이터 스키마 통일

### 3단계 (개선) - 사용자 경험 향상

- [ ] 실시간 알림 시스템 구현
- [ ] 상태 관리 개선 (로컬스토리지 → DB)
- [ ] 에러 처리 및 로딩 상태 개선

---

## 📈 데이터 흐름 개선안

### 목표 아키텍처

```
사용자 액션 → API 호출 → Supabase DB →
실시간 업데이트 → UI 반영 → 알림 생성
```

### 구체적 개선 방안

#### 1. 캠페인 등록 프로세스

```javascript
// 현재 (문제)
캠페인 등록 → localStorage 저장

// 개선안
캠페인 등록 → POST /api/campaigns → DB 저장 →
관리자 알림 생성 → 승인 대기 상태 표시
```

#### 2. 결제 승인 프로세스

```javascript
// 현재 (문제)
Mock 데이터로만 처리

// 개선안
결제 요청 → POST /api/payments → DB 저장 →
관리자 알림 생성 → 승인 처리 → 상태 업데이트
```

#### 3. 알림 시스템

```javascript
// 현재 (문제)
Mock 데이터, 읽음 상태 관리 안됨

// 개선안
이벤트 발생 → POST /api/notifications → DB 저장 →
실시간 알림 → 읽음 처리 → 상태 동기화
```

---

## 🎯 결론 및 권장사항

### 현재 상태

- **프론트엔드**: 잘 구성됨, 사용자 인터페이스 완성도 높음
- **백엔드**: 기본 구조는 있으나 핵심 기능의 DB 연동 부족
- **데이터베이스**: 스키마는 잘 설계되었으나 활용도 낮음

### 권장사항

1. **즉시 개선**: Mock 데이터를 실제 DB 연동으로 교체
2. **단계적 접근**: 핵심 기능부터 순차적으로 개선
3. **테스트 강화**: DB 연동 후 충분한 테스트 필요
4. **문서화**: API 문서 및 데이터 스키마 문서 정리

### 예상 소요 시간

- **1단계 (핵심 기능)**: 2-3주
- **2단계 (데이터 일관성)**: 1-2주
- **3단계 (사용자 경험)**: 1주

이 프로젝트는 프론트엔드가 잘 구성되어 있어서, 백엔드 DB 연동만 개선하면 완전한 기능을 갖춘 플랫폼이 될 수 있습니다.
