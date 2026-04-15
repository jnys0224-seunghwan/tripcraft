# TripCraft — Product Requirements Document

**버전:** 1.0  
**작성일:** 2026-04-15  
**상태:** Draft

---

## 1. 제품 개요

### 1.1 한 줄 정의
TripCraft는 목적지와 여행 일정을 입력하면 AI가 항공편·숙소·식당·관광지를 즉시 추천해주는 여행 플래닝 서비스다.

### 1.2 핵심 가치
- **즉각성** — 입력 후 5초 이내 추천 결과 제공
- **맥락 인식** — 여행 기간·계절·타입에 맞는 맞춤형 추천
- **통합성** — 항공·숙소·식당·관광지를 한 화면에서 탐색

### 1.3 타깃 사용자
- 여행 계획에 시간을 쏟기 싫은 직장인 (25–40세)
- 처음 가는 목적지를 빠르게 파악하고 싶은 여행자
- 여행사 없이 자유여행을 준비하는 개인 여행자

---

## 2. 문제 정의

| 현재 문제 | TripCraft 해결 방식 |
|---|---|
| 항공·숙소·식당·관광지 정보를 각각 다른 사이트에서 수집해야 함 | 단일 인터페이스에서 4가지 카테고리 통합 추천 |
| 검색 결과가 너무 많아 의사결정이 어려움 | AI가 핵심 옵션 5–7개로 큐레이션 |
| 여행 기간·계절에 맞는 정보를 걸러내야 함 | 날짜 입력 기반으로 계절·성수기 반영 |

---

## 3. 기능 요구사항

### 3.1 핵심 기능 (v1)

#### 3.1.1 추천 타입 선택
- `flights` / `hotels` / `restaurants` / `attractions` 4가지 타입
- 탭/버튼 형태로 전환, 타입마다 다른 결과 UI 렌더링

#### 3.1.2 여행 정보 입력
| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| destination | text | ✅ | 도시명 또는 국가명 (자유 입력) |
| startDate | date | ✅ | 여행 시작일 |
| endDate | date | ✅ | 여행 종료일 |
| type | enum | ✅ | flights / hotels / restaurants / attractions |

#### 3.1.3 AI 추천 결과
- **flights**: 항공사, 구간, 소요시간, 경유 횟수, 좌석 등급, 예상 가격
- **hotels**: 숙소명, 카테고리, 위치, 시설, 조식 포함 여부, 1박 요금
- **restaurants**: 식당명, 음식 종류, 가격대, 대표 메뉴, 예약 필요 여부
- **attractions**: 명소명, 카테고리, 설명, 소요시간, 입장료, 최적 방문 시간
- 모든 타입에 **여행 팁** 3–5개 포함

### 3.2 API 명세

**POST /api/recommend**

Request:
```json
{
  "type": "flights | hotels | restaurants | attractions",
  "destination": "string",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD"
}
```

Response: 타입별 스키마 (skill.md 참고)

오류 응답:
- `400` — 필수 필드 누락 또는 유효하지 않은 type
- `500` — Anthropic API 오류

### 3.3 향후 기능 (v2+)
- [ ] 여행 일정 저장 및 불러오기
- [ ] 추천 결과 내보내기 (PDF / 공유 링크)
- [ ] 복수 목적지 멀티시티 지원
- [ ] 여행 스타일 필터 (가족 / 커플 / 솔로 / 비즈니스)
- [ ] 예산 범위 입력 기반 필터링
- [ ] 실시간 가격 연동 (항공·숙소 API)

---

## 4. 비기능 요구사항

| 항목 | 목표 |
|---|---|
| 응답 시간 | AI 추천 결과 10초 이내 |
| 모바일 대응 | 반응형 레이아웃 (375px 이상) |
| 접근성 | 키보드 내비게이션, 적절한 contrast ratio |
| 보안 | API 키는 서버 사이드에서만 사용 (ANTHROPIC_API_KEY) |

---

## 5. 기술 스택

| 레이어 | 기술 |
|---|---|
| 프레임워크 | Next.js (App Router, TypeScript) |
| 스타일 | Tailwind CSS |
| AI | Anthropic Claude claude-opus-4-6 (claude-opus-4-6) |
| AI SDK | @anthropic-ai/sdk |
| 배포 | Vercel (예정) |

---

## 6. 프로젝트 구조

```
tripcraft/
├── app/
│   ├── page.tsx                  # 메인 UI (폼 + 결과)
│   └── api/
│       └── recommend/
│           └── route.ts          # POST /api/recommend
├── skill.md                      # 타입별 프롬프트 전략 및 스키마
├── CLAUDE.md                     # Claude Code 작업 가이드
└── PRD.md                        # 이 문서
```

---

## 7. 성공 지표 (v1)

| 지표 | 목표 |
|---|---|
| 추천 결과 생성 성공률 | ≥ 95% |
| 평균 응답 시간 | ≤ 8초 |
| 타입별 스키마 준수율 | 100% (JSON schema 강제) |
