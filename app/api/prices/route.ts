import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/prices
 *
 * 실시간 가격 조회 엔드포인트.
 * 현재는 mock 데이터를 반환합니다.
 *
 * 실제 API 연동 시 교체할 위치:
 * - 항공: Amadeus Flight Offers API  (https://developers.amadeus.com)
 *          Skyscanner Rapid API        (https://rapidapi.com/skyscanner)
 * - 숙소: Booking.com Affiliate API   (https://developers.booking.com)
 *          Hotels.com / Expedia API
 * - 식당: Google Places API           (https://developers.google.com/maps/documentation/places)
 * - 관광: Google Places API / Viator  (https://www.viator.com/partner)
 */

interface PriceRequest {
  type: string;
  options: { name?: string; airline?: string }[];
}

// 실제 API 응답 형태를 흉내낸 mock
function mockLivePrice(type: string, optionName: string): { live: number; currency: string; source: string } {
  // TODO: 실제 API 호출로 교체
  const base = Math.floor(Math.random() * 200) + 50;
  const sourceMap: Record<string, string> = {
    flights: "Skyscanner",
    hotels: "Booking.com",
    restaurants: "Google",
    attractions: "Viator",
  };
  return {
    live: base,
    currency: "USD",
    source: sourceMap[type] ?? "Live",
  };
}

export async function POST(req: NextRequest) {
  const { type, options }: PriceRequest = await req.json();

  if (!type || !Array.isArray(options)) {
    return NextResponse.json({ error: "type and options are required" }, { status: 400 });
  }

  // 실제 API 호출처럼 약간의 딜레이
  await new Promise((r) => setTimeout(r, 600));

  const prices: Record<number, { live: number; currency: string; source: string }> = {};
  options.forEach((opt, i) => {
    const label = opt.name ?? opt.airline ?? `option-${i}`;
    prices[i] = mockLivePrice(type, label);
  });

  return NextResponse.json({ prices });
}
