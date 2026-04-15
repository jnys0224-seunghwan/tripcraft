# TripCraft — Recommendation Skills

각 `type` 별 프롬프트 전략과 응답 스키마를 정의한다.
`app/api/recommend/route.ts`는 이 문서를 기준으로 구현한다.

**지원 타입:** `flights` | `hotels` | `restaurants` | `attractions`

---

## flights

**목적:** 출발지→목적지 구간의 항공편 옵션 추천

**System Prompt:**
> You are a flight booking expert. Recommend optimal flight options with airline details, pricing, and travel tips.

**프롬프트 전략:**
- 여행 날짜 기반으로 추천 항공사, 경유 여부, 소요 시간 안내
- 이코노미/비즈니스 등 좌석 등급별 옵션 제공
- 성수기 여부, 짐 규정, 체크인 팁 포함
- 옵션 5개 내외로 큐레이션

**응답 스키마:**
```json
{
  "type": "flights",
  "destination": "string",
  "options": [
    {
      "airline": "string",
      "departure": "string",
      "arrival": "string",
      "duration": "string",
      "stops": "number",
      "cabinClass": "string",
      "estimatedPrice": { "min": "number", "max": "number", "currency": "string" }
    }
  ],
  "tips": ["string"]
}
```

---

## hotels

**목적:** 목적지 숙소 추천 (호텔, 리조트, 게스트하우스 등)

**System Prompt:**
> You are a hotel concierge expert. Recommend accommodations suited to the trip duration and traveler style.

**프롬프트 전략:**
- 여행 기간에 맞는 숙소 추천 (장기 숙박 vs 단기 숙박 고려)
- 위치 타입 분류: 도심 / 해변 / 자연 / 공항 근처
- 카테고리 분류: 럭셔리 / 부티크 / 비즈니스 / 버짓
- 시설, 조식 포함 여부 명시
- 옵션 5개 내외로 큐레이션

**응답 스키마:**
```json
{
  "type": "hotels",
  "destination": "string",
  "options": [
    {
      "name": "string",
      "category": "string",
      "location": "string",
      "amenities": ["string"],
      "breakfastIncluded": "boolean",
      "estimatedPrice": { "perNight": "number", "currency": "string" }
    }
  ],
  "tips": ["string"]
}
```

---

## restaurants

**목적:** 목적지의 추천 식당 및 현지 음식 안내

**System Prompt:**
> You are a culinary travel expert. Recommend must-visit restaurants and local food experiences at the destination.

**프롬프트 전략:**
- 현지 대표 음식과 꼭 가봐야 할 맛집 추천
- 가격대 분류: 저렴(budget) / 보통(mid-range) / 고급(fine dining)
- 채식·할랄 등 식이 제한 옵션 고려
- 예약 필요 여부, 대표 시그니처 메뉴 포함
- 옵션 5개 내외로 큐레이션

**응답 스키마:**
```json
{
  "type": "restaurants",
  "destination": "string",
  "options": [
    {
      "name": "string",
      "cuisine": "string",
      "priceRange": "string",
      "signature": ["string"],
      "reservationRequired": "boolean",
      "estimatedPrice": { "perPerson": "number", "currency": "string" }
    }
  ],
  "tips": ["string"]
}
```

---

## attractions

**목적:** 목적지의 관광지, 액티비티, 문화 명소 추천

**System Prompt:**
> You are a travel attractions expert. Recommend top sights, activities, and hidden gems tailored to the travel season.

**프롬프트 전략:**
- 여행 날짜(계절)에 맞는 명소 추천 (축제, 날씨 고려)
- 카테고리 분류: 자연 / 문화 / 역사 / 액티비티 / 쇼핑
- 방문 소요 시간, 입장료, 예약 필요 여부 명시
- 인기 명소 + 숨은 명소 균형 있게 포함
- 옵션 5–7개로 큐레이션

**응답 스키마:**
```json
{
  "type": "attractions",
  "destination": "string",
  "options": [
    {
      "name": "string",
      "category": "string",
      "description": "string",
      "duration": "string",
      "admissionFee": { "amount": "number", "currency": "string", "free": "boolean" },
      "reservationRequired": "boolean",
      "bestTime": "string"
    }
  ],
  "tips": ["string"]
}
```

---

## 새 타입 추가 절차

1. 이 파일에 타입 섹션 추가 (목적 / System Prompt / 프롬프트 전략 / 응답 스키마)
2. `app/api/recommend/route.ts`의 `configs` 객체에 타입 추가
3. `app/page.tsx`의 `TYPE_LABELS`와 `OptionCard`에 렌더링 로직 추가
4. `CLAUDE.md` 핵심 파일 표에 변경사항 반영
