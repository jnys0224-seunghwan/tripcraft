"use client";

import { useState, useEffect } from "react";

type RecommendType = "flights" | "hotels" | "restaurants" | "attractions";
type TravelStyle = "solo" | "couple" | "family" | "business";

const TYPE_LABELS: Record<RecommendType, string> = {
  flights: "✈️ Flights",
  hotels: "🏨 Hotels",
  restaurants: "🍽️ Restaurants",
  attractions: "🗺️ Attractions",
};

const STYLE_LABELS: Record<TravelStyle, string> = {
  solo: "🧳 솔로",
  couple: "💑 커플",
  family: "👨‍👩‍👧 가족",
  business: "💼 비즈니스",
};

const HISTORY_KEY = "tripcraft_history";
const MAX_HISTORY = 5;
const MAX_CITIES = 3;

// ─── Types ───────────────────────────────────────────────

interface CityLeg {
  destination: string;
  startDate: string;
  endDate: string;
}

interface SearchParams {
  type: RecommendType;
  legs: CityLeg[];
  travelStyle: TravelStyle;
  budgetMin: string;
  budgetMax: string;
  currency: string;
}

interface CityResult {
  destination: string;
  data: any;
  prices?: Record<number, { live: number; currency: string; source: string }>;
}

interface HistoryItem {
  params: SearchParams;
  results: CityResult[];
  savedAt: string;
}

// ─── localStorage ─────────────────────────────────────────

function loadHistory(): HistoryItem[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveHistory(item: HistoryItem) {
  const prev = loadHistory().filter(
    (h) => !(
      h.params.type === item.params.type &&
      h.params.legs[0]?.destination === item.params.legs[0]?.destination
    )
  );
  localStorage.setItem(HISTORY_KEY, JSON.stringify([item, ...prev].slice(0, MAX_HISTORY)));
}

// ─── Main Component ───────────────────────────────────────

export default function Home() {
  const [type, setType] = useState<RecommendType>("flights");
  const [legs, setLegs] = useState<CityLeg[]>([{ destination: "", startDate: "", endDate: "" }]);
  const [travelStyle, setTravelStyle] = useState<TravelStyle>("solo");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [currency, setCurrency] = useState("USD");

  // E: 멀티시티
  const [isMultiCity, setIsMultiCity] = useState(false);

  // F: 실시간 가격
  const [livePrice, setLivePrice] = useState(false);
  const [pricesLoading, setPricesLoading] = useState(false);

  const [results, setResults] = useState<CityResult[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [copied, setCopied] = useState(false);

  // URL 파라미터 복원
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("destination")) {
      setType((p.get("type") as RecommendType) ?? "flights");
      setTravelStyle((p.get("travelStyle") as TravelStyle) ?? "solo");
      setBudgetMin(p.get("budgetMin") ?? "");
      setBudgetMax(p.get("budgetMax") ?? "");
      setCurrency(p.get("currency") ?? "USD");
      // 다중 도시 복원
      const rawLegs = p.get("legs");
      if (rawLegs) {
        try {
          const parsed = JSON.parse(rawLegs);
          setLegs(parsed);
          if (parsed.length > 1) setIsMultiCity(true);
        } catch {
          setLegs([{ destination: p.get("destination") ?? "", startDate: p.get("startDate") ?? "", endDate: p.get("endDate") ?? "" }]);
        }
      }
    }
    setHistory(loadHistory());
  }, []);

  // ─── Leg 관리 ─────────────────────────────────────────

  function updateLeg(i: number, field: keyof CityLeg, value: string) {
    setLegs((prev) => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  }

  function addLeg() {
    if (legs.length < MAX_CITIES) setLegs((prev) => [...prev, { destination: "", startDate: "", endDate: "" }]);
  }

  function removeLeg(i: number) {
    setLegs((prev) => prev.filter((_, idx) => idx !== i));
  }

  function toggleMultiCity() {
    if (isMultiCity) {
      setLegs([legs[0]]);
    }
    setIsMultiCity(!isMultiCity);
  }

  // ─── Validation ───────────────────────────────────────

  function validate(): boolean {
    for (const leg of legs) {
      if (!leg.destination || !leg.startDate || !leg.endDate) {
        setError("모든 도시의 목적지와 날짜를 입력해주세요.");
        return false;
      }
      if (new Date(leg.endDate) < new Date(leg.startDate)) {
        setError(`${leg.destination}: 종료일은 시작일보다 같거나 늦어야 합니다.`);
        return false;
      }
    }
    return true;
  }

  // ─── Fetch ────────────────────────────────────────────

  async function fetchCity(leg: CityLeg): Promise<CityResult> {
    const res = await fetch("/api/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        destination: leg.destination,
        startDate: leg.startDate,
        endDate: leg.endDate,
        travelStyle,
        budgetMin,
        budgetMax,
        currency,
      }),
    });
    if (!res.ok) {
      const { error } = await res.json();
      throw new Error(error ?? "Request failed");
    }
    const data = await res.json();
    return { destination: leg.destination, data };
  }

  // F: 실시간 가격 조회
  async function fetchPrices(cityResults: CityResult[]): Promise<CityResult[]> {
    setPricesLoading(true);
    try {
      const updated = await Promise.all(
        cityResults.map(async (cr) => {
          const res = await fetch("/api/prices", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type, options: cr.data?.options ?? [] }),
          });
          if (!res.ok) return cr;
          const { prices } = await res.json();
          return { ...cr, prices };
        })
      );
      return updated;
    } finally {
      setPricesLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setError(null);
    setResults([]);
    setActiveTab(0);

    try {
      // E: 도시별 병렬 요청
      const cityResults = await Promise.all(legs.map(fetchCity));

      let finalResults = cityResults;

      // F: 실시간 가격 추가 조회
      if (livePrice) {
        finalResults = await fetchPrices(cityResults);
      }

      setResults(finalResults);

      // 히스토리 저장
      const params: SearchParams = { type, legs, travelStyle, budgetMin, budgetMax, currency };
      const item: HistoryItem = { params, results: finalResults, savedAt: new Date().toISOString() };
      saveHistory(item);
      setHistory(loadHistory());

      // URL 업데이트
      const qs = new URLSearchParams({
        type,
        travelStyle,
        budgetMin,
        budgetMax,
        currency,
        destination: legs[0].destination,
        legs: JSON.stringify(legs),
      }).toString();
      window.history.replaceState(null, "", `?${qs}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function loadFromHistory(item: HistoryItem) {
    const { params, results } = item;
    setType(params.type);
    setLegs(params.legs);
    setTravelStyle(params.travelStyle);
    setBudgetMin(params.budgetMin);
    setBudgetMax(params.budgetMax);
    setCurrency(params.currency);
    setIsMultiCity(params.legs.length > 1);
    setResults(results);
    setActiveTab(0);
    setError(null);
  }

  const activeResult = results[activeTab];

  // ─── Render ───────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">TripCraft</h1>
          <p className="text-gray-500">AI-powered travel recommendations</p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6 space-y-5"
        >
          {/* 추천 타입 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What are you looking for?
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(Object.keys(TYPE_LABELS) as RecommendType[]).map((t) => (
                <button key={t} type="button" onClick={() => setType(t)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                    type === t ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                  }`}>
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {/* E: 멀티시티 토글 */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              {isMultiCity ? `도시 (${legs.length}/${MAX_CITIES})` : "Destination"}
            </label>
            <button
              type="button"
              onClick={toggleMultiCity}
              className={`text-xs font-medium px-3 py-1 rounded-full border transition-colors ${
                isMultiCity
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
              }`}
            >
              🗺️ 멀티시티
            </button>
          </div>

          {/* 도시 입력 */}
          <div className="space-y-3">
            {legs.map((leg, i) => (
              <div key={i} className="space-y-2">
                {isMultiCity && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-400 w-12">도시 {i + 1}</span>
                    {legs.length > 1 && (
                      <button type="button" onClick={() => removeLeg(i)}
                        className="text-xs text-red-400 hover:text-red-600">
                        ✕ 삭제
                      </button>
                    )}
                  </div>
                )}
                <input
                  type="text"
                  value={leg.destination}
                  onChange={(e) => updateLeg(i, "destination", e.target.value)}
                  placeholder="e.g. Tokyo, Japan"
                  required
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input type="date" value={leg.startDate}
                    onChange={(e) => updateLeg(i, "startDate", e.target.value)}
                    required
                    className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                  <input type="date" value={leg.endDate}
                    onChange={(e) => updateLeg(i, "endDate", e.target.value)}
                    required
                    className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
              </div>
            ))}

            {isMultiCity && legs.length < MAX_CITIES && (
              <button type="button" onClick={addLeg}
                className="w-full py-2 rounded-lg border border-dashed border-gray-300 text-sm text-gray-500 hover:border-gray-500 hover:text-gray-700 transition-colors">
                + 도시 추가
              </button>
            )}
          </div>

          {/* 여행 스타일 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Travel Style</label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(STYLE_LABELS) as TravelStyle[]).map((s) => (
                <button key={s} type="button" onClick={() => setTravelStyle(s)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                    travelStyle === s ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                  }`}>
                  {STYLE_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* 예산 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Budget <span className="text-gray-400 font-normal">(선택)</span>
            </label>
            <div className="flex gap-2 items-center">
              <select value={currency} onChange={(e) => setCurrency(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
                {["USD", "KRW", "JPY", "EUR", "SGD"].map((c) => <option key={c}>{c}</option>)}
              </select>
              <input type="number" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)}
                placeholder="최소" min={0}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
              <span className="text-gray-400 text-sm shrink-0">–</span>
              <input type="number" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)}
                placeholder="최대" min={0}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
          </div>

          {/* F: 실시간 가격 토글 */}
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium text-gray-700">실시간 가격 조회</p>
              <p className="text-xs text-gray-400">AI 추천 결과에 현재 시세를 추가로 표시합니다</p>
            </div>
            <button
              type="button"
              onClick={() => setLivePrice(!livePrice)}
              className={`relative w-11 h-6 rounded-full transition-colors ${livePrice ? "bg-gray-900" : "bg-gray-200"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${livePrice ? "translate-x-5" : ""}`} />
            </button>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors">
            {loading ? "Finding recommendations…" : "Get Recommendations"}
          </button>
        </form>

        {/* 에러 */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm mb-6">
            {error}
          </div>
        )}

        {/* 로딩 스켈레톤 */}
        {loading && <Skeleton />}

        {/* E: 멀티시티 탭 */}
        {!loading && results.length > 0 && (
          <div>
            {results.length > 1 && (
              <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                {results.map((r, i) => (
                  <button key={i} onClick={() => setActiveTab(i)}
                    className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                      activeTab === i ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                    }`}>
                    {r.destination}
                  </button>
                ))}
              </div>
            )}

            {/* F: 실시간 가격 로딩 표시 */}
            {pricesLoading && (
              <div className="text-xs text-gray-400 mb-3 flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                실시간 가격 조회 중…
              </div>
            )}

            {activeResult && (
              activeResult.data?.options?.length > 0
                ? <Results
                    data={activeResult.data}
                    prices={activeResult.prices}
                    onShare={handleShare}
                    copied={copied}
                  />
                : <Empty />
            )}
          </div>
        )}

        {/* 히스토리 */}
        {history.length > 0 && !loading && (
          <div className="mt-8">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">최근 검색</h3>
            <div className="space-y-2">
              {history.map((item, i) => (
                <button key={i} onClick={() => loadFromHistory(item)}
                  className="w-full text-left bg-white rounded-xl border border-gray-200 px-4 py-3 hover:border-gray-400 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-800">
                      {TYPE_LABELS[item.params.type]} · {item.params.legs.map(l => l.destination).join(" → ")}
                    </span>
                    <span className="text-xs text-gray-400">{STYLE_LABELS[item.params.travelStyle]}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {item.params.legs[0].startDate} ~ {item.params.legs[item.params.legs.length - 1].endDate}
                    {item.params.legs.length > 1 && <span className="ml-2 text-blue-400">멀티시티</span>}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub Components ───────────────────────────────────────

function Skeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4 animate-pulse">
      <div className="h-5 w-1/3 bg-gray-200 rounded" />
      <div className="h-3 w-1/4 bg-gray-100 rounded" />
      {[...Array(3)].map((_, i) => (
        <div key={i} className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-2">
          <div className="flex justify-between">
            <div className="h-4 w-1/3 bg-gray-200 rounded" />
            <div className="h-4 w-16 bg-gray-100 rounded-full" />
          </div>
          <div className="h-3 w-2/3 bg-gray-100 rounded" />
          <div className="h-3 w-1/2 bg-gray-100 rounded" />
        </div>
      ))}
    </div>
  );
}

function Empty() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 text-center">
      <p className="text-gray-400 text-sm">추천 결과를 찾지 못했습니다. 다른 목적지나 날짜로 다시 시도해보세요.</p>
    </div>
  );
}

function Results({
  data,
  prices,
  onShare,
  copied,
}: {
  data: any;
  prices?: Record<number, { live: number; currency: string; source: string }>;
  onShare: () => void;
  copied: boolean;
}) {
  const type: RecommendType = data.type;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{data.destination}</h2>
          <p className="text-sm text-gray-400 mt-0.5">{TYPE_LABELS[type]} recommendations</p>
        </div>
        <button onClick={onShare}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:border-gray-400 transition-colors shrink-0">
          {copied ? "✅ 복사됨" : "🔗 공유"}
        </button>
      </div>

      <div className="space-y-4">
        {data.options?.map((option: any, i: number) => (
          <OptionCard key={i} type={type} option={option} livePrice={prices?.[i]} />
        ))}
      </div>

      {data.tips?.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Tips</h3>
          <ul className="space-y-1">
            {data.tips.map((tip: string, i: number) => (
              <li key={i} className="text-sm text-gray-600 flex gap-2">
                <span className="text-gray-300">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function OptionCard({
  type,
  option,
  livePrice,
}: {
  type: RecommendType;
  option: any;
  livePrice?: { live: number; currency: string; source: string };
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-2">
      {/* F: 실시간 가격 배지 */}
      {livePrice && (
        <div className="flex justify-end">
          <span className="text-xs bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-0.5">
            🟢 Live {livePrice.currency} {livePrice.live.toLocaleString()} via {livePrice.source}
          </span>
        </div>
      )}

      {type === "flights" && (
        <>
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-900">{option.airline}</span>
            <span className="text-xs text-gray-500 bg-white border border-gray-200 rounded-full px-2 py-0.5">
              {option.cabinClass}
            </span>
          </div>
          <p className="text-sm text-gray-600">
            {option.departure} → {option.arrival} · {option.duration} ·{" "}
            {option.stops === 0 ? "Nonstop" : `${option.stops} stop(s)`}
          </p>
          <p className="text-sm font-medium text-gray-800">
            {option.estimatedPrice.currency} {option.estimatedPrice.min.toLocaleString()} –{" "}
            {option.estimatedPrice.max.toLocaleString()}
          </p>
        </>
      )}

      {type === "hotels" && (
        <>
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-900">{option.name}</span>
            <span className="text-xs text-gray-500 bg-white border border-gray-200 rounded-full px-2 py-0.5">
              {option.category}
            </span>
          </div>
          <p className="text-sm text-gray-600">{option.location}</p>
          <p className="text-sm text-gray-600">{option.amenities.join(" · ")}</p>
          <div className="flex items-center justify-between text-sm">
            <span className={option.breakfastIncluded ? "text-green-600" : "text-gray-400"}>
              {option.breakfastIncluded ? "Breakfast included" : "No breakfast"}
            </span>
            <span className="font-medium text-gray-800">
              {option.estimatedPrice.currency} {option.estimatedPrice.perNight.toLocaleString()} / night
            </span>
          </div>
        </>
      )}

      {type === "restaurants" && (
        <>
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-900">{option.name}</span>
            <span className="text-xs text-gray-500 bg-white border border-gray-200 rounded-full px-2 py-0.5">
              {option.priceRange}
            </span>
          </div>
          <p className="text-sm text-gray-600">{option.cuisine}</p>
          <p className="text-sm text-gray-500">🍴 {option.signature.join(", ")}</p>
          <div className="flex items-center justify-between text-sm">
            <span className={option.reservationRequired ? "text-amber-600" : "text-gray-400"}>
              {option.reservationRequired ? "Reservation required" : "Walk-in available"}
            </span>
            <span className="font-medium text-gray-800">
              ~{option.estimatedPrice.currency} {option.estimatedPrice.perPerson.toLocaleString()} / person
            </span>
          </div>
        </>
      )}

      {type === "attractions" && (
        <>
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-900">{option.name}</span>
            <span className="text-xs text-gray-500 bg-white border border-gray-200 rounded-full px-2 py-0.5">
              {option.category}
            </span>
          </div>
          <p className="text-sm text-gray-600">{option.description}</p>
          <div className="flex flex-wrap gap-3 text-sm text-gray-500">
            <span>⏱ {option.duration}</span>
            <span>🕐 {option.bestTime}</span>
            <span>
              {option.admissionFee.free
                ? "🎟 Free"
                : `🎟 ${option.admissionFee.currency} ${option.admissionFee.amount.toLocaleString()}`}
            </span>
            {option.reservationRequired && <span className="text-amber-600">Reservation required</span>}
          </div>
        </>
      )}
    </div>
  );
}
