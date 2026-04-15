import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

type RecommendType = "flights" | "hotels" | "restaurants" | "attractions";

interface PromptConfig {
  systemPrompt: string;
  userPrompt: (
    destination: string,
    startDate: string,
    endDate: string,
    travelStyle: string,
    budget: string
  ) => string;
  schema: object;
}

const configs: Record<RecommendType, PromptConfig> = {
  flights: {
    systemPrompt:
      "You are a flight booking expert. Recommend optimal flight options with airline details, pricing, and travel tips.",
    userPrompt: (destination, startDate, endDate, travelStyle, budget) => `
Recommend flight options for the following trip:
- Destination: ${destination}
- Travel Dates: ${startDate} ~ ${endDate}
- Travel Style: ${travelStyle}
${budget ? `- Budget: ${budget}` : ""}

Tailor recommendations to the travel style. Include economy and business class options, stop counts, duration, and baggage tips.
Respond in JSON matching the required schema.`,
    schema: {
      type: "object",
      properties: {
        type: { type: "string" },
        destination: { type: "string" },
        options: {
          type: "array",
          items: {
            type: "object",
            properties: {
              airline: { type: "string" },
              departure: { type: "string" },
              arrival: { type: "string" },
              duration: { type: "string" },
              stops: { type: "number" },
              cabinClass: { type: "string" },
              estimatedPrice: {
                type: "object",
                properties: {
                  min: { type: "number" },
                  max: { type: "number" },
                  currency: { type: "string" },
                },
                required: ["min", "max", "currency"],
                additionalProperties: false,
              },
            },
            required: ["airline", "departure", "arrival", "duration", "stops", "cabinClass", "estimatedPrice"],
            additionalProperties: false,
          },
        },
        tips: { type: "array", items: { type: "string" } },
      },
      required: ["type", "destination", "options", "tips"],
      additionalProperties: false,
    },
  },

  hotels: {
    systemPrompt:
      "You are a hotel concierge expert. Recommend accommodations suited to the trip duration and traveler style.",
    userPrompt: (destination, startDate, endDate, travelStyle, budget) => `
Recommend hotels for the following trip:
- Destination: ${destination}
- Check-in: ${startDate}, Check-out: ${endDate}
- Travel Style: ${travelStyle}
${budget ? `- Budget: ${budget}` : ""}

Tailor recommendations to the travel style (e.g. family-friendly rooms, romantic boutique hotels, business amenities).
Include various categories, location types, amenities, and breakfast availability.
Respond in JSON matching the required schema.`,
    schema: {
      type: "object",
      properties: {
        type: { type: "string" },
        destination: { type: "string" },
        options: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              category: { type: "string" },
              location: { type: "string" },
              amenities: { type: "array", items: { type: "string" } },
              breakfastIncluded: { type: "boolean" },
              estimatedPrice: {
                type: "object",
                properties: {
                  perNight: { type: "number" },
                  currency: { type: "string" },
                },
                required: ["perNight", "currency"],
                additionalProperties: false,
              },
            },
            required: ["name", "category", "location", "amenities", "breakfastIncluded", "estimatedPrice"],
            additionalProperties: false,
          },
        },
        tips: { type: "array", items: { type: "string" } },
      },
      required: ["type", "destination", "options", "tips"],
      additionalProperties: false,
    },
  },

  restaurants: {
    systemPrompt:
      "You are a culinary travel expert. Recommend must-visit restaurants and local food experiences at the destination.",
    userPrompt: (destination, startDate, endDate, travelStyle, budget) => `
Recommend restaurants for a trip to:
- Destination: ${destination}
- Visit Period: ${startDate} ~ ${endDate}
- Travel Style: ${travelStyle}
${budget ? `- Budget: ${budget}` : ""}

Tailor recommendations to the travel style (e.g. family-friendly menus, romantic dining, quick business lunches).
Include a mix of price ranges, local cuisine highlights, signature dishes, and reservation tips.
Consider dietary options (vegetarian, halal). Respond in JSON matching the required schema.`,
    schema: {
      type: "object",
      properties: {
        type: { type: "string" },
        destination: { type: "string" },
        options: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              cuisine: { type: "string" },
              priceRange: { type: "string" },
              signature: { type: "array", items: { type: "string" } },
              reservationRequired: { type: "boolean" },
              estimatedPrice: {
                type: "object",
                properties: {
                  perPerson: { type: "number" },
                  currency: { type: "string" },
                },
                required: ["perPerson", "currency"],
                additionalProperties: false,
              },
            },
            required: ["name", "cuisine", "priceRange", "signature", "reservationRequired", "estimatedPrice"],
            additionalProperties: false,
          },
        },
        tips: { type: "array", items: { type: "string" } },
      },
      required: ["type", "destination", "options", "tips"],
      additionalProperties: false,
    },
  },

  attractions: {
    systemPrompt:
      "You are a travel attractions expert. Recommend top sights, activities, and hidden gems tailored to the travel season.",
    userPrompt: (destination, startDate, endDate, travelStyle, budget) => `
Recommend attractions for the following trip:
- Destination: ${destination}
- Travel Dates: ${startDate} ~ ${endDate}
- Travel Style: ${travelStyle}
${budget ? `- Budget: ${budget}` : ""}

Tailor recommendations to the travel style (e.g. kid-friendly for family, adventure activities for solo, cultural spots for business).
Include a mix of nature, culture, history, activities, and shopping.
Note visit duration, admission fees, reservation requirements, and best visiting times.
Respond in JSON matching the required schema.`,
    schema: {
      type: "object",
      properties: {
        type: { type: "string" },
        destination: { type: "string" },
        options: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              category: { type: "string" },
              description: { type: "string" },
              duration: { type: "string" },
              admissionFee: {
                type: "object",
                properties: {
                  amount: { type: "number" },
                  currency: { type: "string" },
                  free: { type: "boolean" },
                },
                required: ["amount", "currency", "free"],
                additionalProperties: false,
              },
              reservationRequired: { type: "boolean" },
              bestTime: { type: "string" },
            },
            required: ["name", "category", "description", "duration", "admissionFee", "reservationRequired", "bestTime"],
            additionalProperties: false,
          },
        },
        tips: { type: "array", items: { type: "string" } },
      },
      required: ["type", "destination", "options", "tips"],
      additionalProperties: false,
    },
  },
};

const VALID_TYPES: RecommendType[] = ["flights", "hotels", "restaurants", "attractions"];

const MOCK_DATA: Record<RecommendType, (destination: string) => object> = {
  flights: (destination) => ({
    type: "flights",
    destination,
    options: [
      {
        airline: "Korean Air",
        departure: "ICN",
        arrival: "NRT",
        duration: "2h 30m",
        stops: 0,
        cabinClass: "Economy",
        estimatedPrice: { min: 250, max: 400, currency: "USD" },
      },
      {
        airline: "Asiana Airlines",
        departure: "ICN",
        arrival: "NRT",
        duration: "2h 35m",
        stops: 0,
        cabinClass: "Economy",
        estimatedPrice: { min: 230, max: 380, currency: "USD" },
      },
      {
        airline: "Japan Airlines",
        departure: "ICN",
        arrival: "HND",
        duration: "2h 25m",
        stops: 0,
        cabinClass: "Business",
        estimatedPrice: { min: 800, max: 1200, currency: "USD" },
      },
    ],
    tips: [
      "성수기(벚꽃·단풍 시즌)는 최소 2개월 전 예약 권장",
      "수하물 규정은 항공사마다 다르니 사전 확인 필수",
      "인천-하네다 노선이 도심 접근성이 더 좋음",
    ],
  }),
  hotels: (destination) => ({
    type: "hotels",
    destination,
    options: [
      {
        name: "Park Hyatt Tokyo",
        category: "Luxury",
        location: "Shinjuku, City Center",
        amenities: ["Pool", "Spa", "Fitness Center", "Concierge"],
        breakfastIncluded: false,
        estimatedPrice: { perNight: 450, currency: "USD" },
      },
      {
        name: "Sotetsu Fresa Inn",
        category: "Business",
        location: "Shibuya, City Center",
        amenities: ["Free WiFi", "Laundry", "24h Front Desk"],
        breakfastIncluded: true,
        estimatedPrice: { perNight: 90, currency: "USD" },
      },
      {
        name: "Khaosan Tokyo Ninja",
        category: "Hostel",
        location: "Asakusa, Old Town",
        amenities: ["Free WiFi", "Shared Kitchen", "Lounge"],
        breakfastIncluded: false,
        estimatedPrice: { perNight: 35, currency: "USD" },
      },
    ],
    tips: [
      "도쿄는 숙소 가격이 높으니 Booking.com·Agoda 비교 필수",
      "신주쿠·시부야·아사쿠사는 교통 허브라 이동이 편리",
      "조식 포함 여부보다 위치를 우선시하는 편이 효율적",
    ],
  }),
  restaurants: (destination) => ({
    type: "restaurants",
    destination,
    options: [
      {
        name: "Sukiyabashi Jiro",
        cuisine: "Japanese Sushi",
        priceRange: "Fine Dining",
        signature: ["Omakase Sushi", "Toro", "Uni"],
        reservationRequired: true,
        estimatedPrice: { perPerson: 300, currency: "USD" },
      },
      {
        name: "Ichiran Ramen",
        cuisine: "Japanese Ramen",
        priceRange: "Budget",
        signature: ["Tonkotsu Ramen", "Half-boiled Egg"],
        reservationRequired: false,
        estimatedPrice: { perPerson: 15, currency: "USD" },
      },
      {
        name: "Gonpachi Nishi-Azabu",
        cuisine: "Japanese Izakaya",
        priceRange: "Mid-range",
        signature: ["Yakitori", "Tempura", "Sake"],
        reservationRequired: false,
        estimatedPrice: { perPerson: 50, currency: "USD" },
      },
    ],
    tips: [
      "미슐랭 레스토랑은 수개월 전 예약이 일반적",
      "편의점(세븐일레븐·로손) 음식도 현지 필수 체험",
      "현금 결제만 받는 식당이 많으니 엔화 준비 필수",
    ],
  }),
  attractions: (destination) => ({
    type: "attractions",
    destination,
    options: [
      {
        name: "Senso-ji Temple",
        category: "Culture",
        description: "도쿄에서 가장 오래된 사원. 나카미세 쇼핑 거리와 함께 즐기기 좋음",
        duration: "1–2 hours",
        admissionFee: { amount: 0, currency: "JPY", free: true },
        reservationRequired: false,
        bestTime: "Early morning (7–9am) to avoid crowds",
      },
      {
        name: "teamLab Borderless",
        category: "Activity",
        description: "몰입형 디지털 아트 뮤지엄. 사진 명소로도 유명",
        duration: "2–3 hours",
        admissionFee: { amount: 3200, currency: "JPY", free: false },
        reservationRequired: true,
        bestTime: "Weekday afternoons",
      },
      {
        name: "Shibuya Crossing",
        category: "Culture",
        description: "세계에서 가장 바쁜 교차로. 스크램블 교차로 체험",
        duration: "30 minutes",
        admissionFee: { amount: 0, currency: "JPY", free: true },
        reservationRequired: false,
        bestTime: "Evening rush hour (6–8pm)",
      },
    ],
    tips: [
      "스이카(Suica) 카드 하나로 지하철·버스·편의점 모두 결제 가능",
      "Google Maps 오프라인 지도 미리 다운로드 권장",
      "4월 벚꽃·11월 단풍 시즌은 명소마다 인파가 몰림",
    ],
  }),
};

export async function POST(req: NextRequest) {
  const { type, destination, startDate, endDate, travelStyle = "solo", budgetMin, budgetMax, currency = "USD" } = await req.json();

  const budget = budgetMin && budgetMax
    ? `${currency} ${budgetMin} – ${budgetMax}`
    : budgetMin
    ? `${currency} ${budgetMin}+`
    : "";

  if (!type || !destination || !startDate || !endDate) {
    return NextResponse.json(
      { error: "type, destination, startDate, endDate are required" },
      { status: 400 }
    );
  }

  if (new Date(endDate) < new Date(startDate)) {
    return NextResponse.json(
      { error: "종료일은 시작일보다 같거나 늦어야 합니다." },
      { status: 400 }
    );
  }

  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json(
      { error: `type must be one of: ${VALID_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  // API 키가 없으면 mock 데이터 반환
  if (!process.env.ANTHROPIC_API_KEY) {
    await new Promise((r) => setTimeout(r, 800)); // 로딩 UX 확인용
    return NextResponse.json(MOCK_DATA[type as RecommendType](destination));
  }

  const config = configs[type as RecommendType];

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 16000,
      system: config.systemPrompt,
      messages: [
        {
          role: "user",
          content: config.userPrompt(destination, startDate, endDate, travelStyle, budget),
        },
      ],
      output_config: {
        format: {
          type: "json_schema",
          schema: config.schema,
        },
      },
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const data = textBlock ? JSON.parse(textBlock.text) : null;

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[/api/recommend]", err);
    return NextResponse.json(
      { error: "AI 추천 생성에 실패했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500 }
    );
  }
}
