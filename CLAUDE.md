@AGENTS.md

# TripCraft — Claude Code 작업 가이드

## 프로젝트 개요

TripCraft는 AI 기반 여행 추천 서비스다. 사용자가 목적지와 날짜를 입력하면
Claude claude-opus-4-6 모델이 항공편·숙소·식당·관광지를 JSON으로 반환한다.
자세한 제품 요구사항은 `PRD.md`를 참고한다.

## 기술 스택

- **Next.js App Router** + **TypeScript** + **Tailwind CSS**
- **AI**: `@anthropic-ai/sdk` → `claude-opus-4-6` 모델
- API 키: `ANTHROPIC_API_KEY` 환경변수 (서버 사이드 전용, 클라이언트 노출 금지)

## 핵심 파일

| 파일 | 역할 |
|---|---|
| `app/page.tsx` | 메인 UI — 입력 폼, 결과 렌더링 (Client Component) |
| `app/api/recommend/route.ts` | POST /api/recommend — Anthropic API 호출 |
| `skill.md` | 타입별 프롬프트 전략 및 응답 스키마 정의 |
| `PRD.md` | 제품 요구사항 문서 |

## 추천 타입

`flights` / `hotels` / `restaurants` / `attractions` 4가지.
각 타입마다 별도의 system prompt, user prompt, JSON schema를 사용한다.
타입별 상세 전략은 반드시 `skill.md`를 읽고 따른다.

## 코드 작성 규칙

- `route.ts` 수정 시 `skill.md`의 스키마와 일치하는지 확인
- 새 추천 타입 추가 시 `skill.md` → `route.ts` → `page.tsx` 순서로 업데이트
- AI 응답은 항상 `output_config.format.json_schema`로 구조를 강제한다
- 유효하지 않은 type 입력은 400으로 즉시 반환
- API 키는 절대 클라이언트 코드(`"use client"` 파일)에 노출하지 않는다

## 로컬 실행

```bash
# 환경변수 설정
echo "ANTHROPIC_API_KEY=your-key" > .env.local

# 개발 서버 시작
npm run dev
# → http://localhost:3000
```

## API 테스트

```bash
curl -X POST http://localhost:3000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{"type":"hotels","destination":"Tokyo","startDate":"2026-05-01","endDate":"2026-05-07"}'
```
