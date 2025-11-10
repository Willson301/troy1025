# Bubble 데이터베이스 구조 설정 가이드

## 🎯 Troy Platform을 Bubble로 구현하기

---

## 📊 Data Types (데이터 타입)

### 1. User (기본 제공)
Bubble 기본 User 타입에 다음 필드 추가:

| 필드명 | 타입 | 옵션 |
|--------|------|------|
| user_type | Option Set | Advertiser, Agency, Partner, Admin |
| username | text | unique |
| approval_status | Option Set | pending, approved, rejected |
| approved_at | date |
| rejected_reason | text |

---

### 2. Advertiser (광고주)
| 필드명 | 타입 | 설명 |
|--------|------|------|
| user | User | 연결된 사용자 |
| business_number | text | 사업자번호 (unique) |
| company_name | text | 회사명 |
| manager_name | text | 담당자명 |
| phone | text | 연락처 |
| email | text | 이메일 |
| product_url | text | 상품 URL |
| approval_status | Option Set | pending, approved, rejected |
| approved_at | date |
| rejected_reason | text |
| created_at | date | (자동) |

---

### 3. Agency (대행사)
| 필드명 | 타입 | 설명 |
|--------|------|------|
| user | User | 연결된 사용자 |
| agency_name | text | 대행사명 |
| business_number | text | 사업자번호 (unique) |
| manager_name | text | 담당자명 |
| phone | text | 연락처 |
| email | text | 이메일 |
| website_url | text | 웹사이트 URL |
| approval_status | Option Set | pending, approved, rejected |
| approved_at | date |
| rejected_reason | text |
| created_at | date | (자동) |

---

### 4. Partner (파트너)
| 필드명 | 타입 | 설명 |
|--------|------|------|
| user | User | 연결된 사용자 |
| partner_code | text | 파트너 코드 (unique) |
| manager_name | text | 담당자명 |
| phone | text | 연락처 |
| email | text | 이메일 |
| messenger_id | text | 메신저 ID |
| approval_status | Option Set | pending, approved, rejected |
| approved_at | date |
| rejected_reason | text |
| created_at | date | (자동) |

---

### 5. Campaign (캠페인)
| 필드명 | 타입 | 설명 |
|--------|------|------|
| campaign_code | text | 캠페인 코드 (unique) |
| advertiser | Advertiser | 광고주 |
| agency | Agency | 대행사 (optional) |
| partner | Partner | 파트너 (optional) |
| campaign_name | text | 캠페인명 |
| product_name | text | 상품명 |
| product_url | text | 상품 URL |
| start_date | date | 시작일 |
| end_date | date | 종료일 |
| budget | number | 예산 |
| status | Option Set | draft, active, paused, completed |
| created_at | date | (자동) |

---

### 6. Payment (결제)
| 필드명 | 타입 | 설명 |
|--------|------|------|
| user | User | 결제한 사용자 |
| campaign | Campaign | 관련 캠페인 |
| amount | number | 금액 |
| payment_method | Option Set | card, bank, virtual |
| payment_status | Option Set | pending, completed, failed, refunded |
| paid_at | date | 결제일시 |
| created_at | date | (자동) |

---

### 7. Ticket (고객지원)
| 필드명 | 타입 | 설명 |
|--------|------|------|
| user | User | 작성자 |
| title | text | 제목 |
| content | text | 내용 |
| category | Option Set | general, payment, technical, etc |
| status | Option Set | open, in_progress, closed |
| priority | Option Set | low, medium, high |
| created_at | date | (자동) |

---

### 8. TicketComment (티켓 댓글)
| 필드명 | 타입 | 설명 |
|--------|------|------|
| ticket | Ticket | 연결된 티켓 |
| user | User | 작성자 |
| comment | text | 댓글 내용 |
| is_admin | yes/no | 관리자 여부 |
| created_at | date | (자동) |

---

## 🎨 Option Sets (선택지 목록)

### user_type
- Advertiser
- Agency
- Partner
- Admin

### approval_status
- pending (대기중)
- approved (승인됨)
- rejected (거절됨)

### campaign_status
- draft (초안)
- active (진행중)
- paused (일시중지)
- completed (완료)

### payment_status
- pending (대기중)
- completed (완료)
- failed (실패)
- refunded (환불)

### payment_method
- card (카드)
- bank (계좌이체)
- virtual (가상계좌)

### ticket_status
- open (열림)
- in_progress (처리중)
- closed (닫힘)

### ticket_priority
- low (낮음)
- medium (보통)
- high (높음)

---

## 🔐 Privacy Rules (접근 권한)

### User
- 자신의 정보만 조회/수정 가능
- Admin은 모든 사용자 조회 가능

### Advertiser, Agency, Partner
- 자신의 정보만 조회/수정 가능
- Admin은 모든 정보 조회/수정 가능

### Campaign
- 생성자만 수정 가능
- 관련된 Advertiser, Agency, Partner는 조회 가능
- Admin은 모든 캠페인 조회/수정 가능

### Payment
- 자신의 결제 내역만 조회 가능
- Admin은 모든 결제 조회 가능

### Ticket
- 작성자와 Admin만 조회/수정 가능

---

## 🚀 Bubble 설정 순서

1. **Data Tab → Data Types**
   - 위 표대로 데이터 타입 생성

2. **Data Tab → Option Sets**
   - 위 선택지 목록 생성

3. **Data Tab → Privacy**
   - 접근 권한 규칙 설정

4. **Design Tab**
   - 페이지 디자인 (드래그 앤 드롭)

5. **Workflow Tab**
   - 버튼 클릭, 데이터 저장 등 로직 설정

---

## 💡 다음 단계

1. Bubble.io 회원가입
2. 새 앱 생성
3. 이 가이드대로 Data Types 설정
4. Option Sets 생성
5. Privacy Rules 설정
6. 페이지 디자인 시작

---

**도메인 연결 (troy.io.kr):**
- Bubble 유료 플랜 필요 ($29/월)
- Settings → Domain → Add custom domain
- 카페24 DNS 설정 변경
