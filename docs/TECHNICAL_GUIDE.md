# 기술 지침서

> Lecture Pulse 시스템 아키텍처, DB 스키마, API 명세

---

## 1. 시스템 아키텍처

### 전체 아키텍처 다이어그램

```
┌──────────────────────────────────────────────────────────────────────┐
│                          클라이언트 레이어                              │
│                                                                        │
│   ┌──────────────────┐         ┌──────────────────────────────────┐   │
│   │   교수 브라우저    │         │          학생 브라우저               │   │
│   │                  │         │                                  │   │
│   │  /session/[code] │         │  /session/[code]/student         │   │
│   │  /dashboard      │         │                                  │   │
│   │  /report         │         │  • 이해도 신호 버튼               │   │
│   │                  │         │  • 질문 입력                     │   │
│   │  • 실시간 차트    │         │  • 투표 참여                     │   │
│   │  • 질문 클러스터  │         │  • PDF 요약 요청                 │   │
│   │  • 투표 관리      │         │                                  │   │
│   └────────┬─────────┘         └──────────────┬───────────────────┘   │
└────────────│───────────────────────────────────│──────────────────────┘
             │                                   │
             │      HTTPS + WebSocket             │
             ▼                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         Next.js 16 App Router                         │
│                           (Vercel 배포)                                │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                      Route Handlers (API)                        │  │
│  │                                                                  │  │
│  │   POST /api/cluster      GET /api/report    POST /api/summarize  │  │
│  │   └─ 질문 군집화          └─ 리포트 생성      └─ PDF 요약         │  │
│  └──────────────────────────────┬───────────────────────────────────┘  │
└─────────────────────────────────│────────────────────────────────────┘
                                  │
              ┌───────────────────┼──────────────────────┐
              │                   │                      │
              ▼                   ▼                      ▼
┌─────────────────────┐ ┌──────────────────┐ ┌────────────────────────┐
│   Supabase           │ │ Supabase Realtime │ │  Anthropic Claude API  │
│   PostgreSQL         │ │                  │ │                        │
│                      │ │  WebSocket 채널  │ │  claude-3-5-haiku      │
│  sessions            │ │                  │ │  -20241022             │
│  responses           │ │  responses-{id}  │ │                        │
│  questions           │ │  questions-{id}  │ │  • 질문 클러스터링     │
│  polls               │ │  polls-{id}      │ │  • PDF 요약            │
│  poll_votes          │ │  poll-votes-{id} │ │  • 수업 리포트 생성    │
│  materials           │ │  session-{id}    │ │                        │
└─────────────────────┘ └──────────────────┘ └────────────────────────┘
              │
              ▼
┌─────────────────────┐
│   Supabase Storage  │
│                     │
│   PDF 강의자료 저장  │
│   공개 URL 제공     │
└─────────────────────┘
```

### 데이터 흐름 요약

1. **이해도 신호**: 학생 클릭 → Supabase INSERT → Realtime 채널 브로드캐스트 → 교수 대시보드 즉시 반영
2. **질문 클러스터링**: 교수 요청 → `/api/cluster` → Claude API (or 키워드 폴백) → DB UPDATE → 대시보드 갱신
3. **PDF 요약**: 학생 요청 → `/api/summarize` → DB 캐시 확인 → (없으면) Claude에 PDF URL 전달 → 요약 저장 → 반환
4. **수업 리포트**: 세션 종료 후 교수 요청 → `/api/report` → 통계 집계 → Claude 요약 생성 → 렌더링

---

## 2. 기술 스택과 선택 이유

### 프론트엔드

| 기술 | 버전 | 선택 이유 |
|------|------|-----------|
| **Next.js** | 16.2.2 | App Router로 서버/클라이언트 컴포넌트 분리. Route Handlers로 백엔드 API까지 단일 레포에서 관리. Vercel 네이티브 배포. |
| **React** | 19.2.4 | Next.js 16과 호환되는 최신 버전. Concurrent Features로 실시간 UI 업데이트 최적화. |
| **TypeScript** | 5 | DB 타입, API 응답 타입을 컴파일 타임에 검증. Supabase 자동 타입 생성과 연계. |
| **Tailwind CSS** | 4 | 유틸리티 퍼스트로 빠른 UI 개발. Dark mode 지원 내장. JIT 컴파일로 번들 크기 최소화. |

### 백엔드/인프라

| 기술 | 선택 이유 |
|------|-----------|
| **Supabase (PostgreSQL)** | 관계형 DB의 무결성(FK, cascade delete)과 Realtime WebSocket을 동시에 제공. 별도 WebSocket 서버 불필요. 스토리지까지 통합. |
| **Supabase Realtime** | DB INSERT/UPDATE 이벤트를 테이블 필터(session_id)와 함께 WebSocket으로 브로드캐스트. 구독 코드가 몇 줄로 끝남. |
| **Supabase Storage** | PDF를 업로드하면 공개 URL이 발급됨. Claude API에 직접 URL을 전달해 별도 파일 처리 불필요. |
| **Anthropic Claude API** | 한국어 이해 수준이 높음. `document` 타입으로 PDF URL을 직접 처리 가능. Haiku 모델로 비용/속도 최적화. |
| **Vercel** | Next.js 최적화 배포 환경. Route Handlers가 서버리스 함수로 자동 변환. Edge 네트워크로 글로벌 레이턴시 최소화. |

### 왜 별도 서버가 없는가?

Next.js Route Handlers + Vercel의 조합으로 Express.js나 별도 백엔드 서버 없이 API를 구현했다. 이는 다음을 의미한다:
- 배포 복잡도 제로 (단일 `vercel deploy`)
- 오토스케일링 기본 제공 (서버리스)
- 콜드 스타트 최소화 (Vercel Fluid Compute)

---

## 3. DB 스키마

### 전체 ERD

```
sessions
  │id (PK)
  │code (UNIQUE)
  │name
  │is_active
  │created_at
  │
  ├─── responses (FK: session_id)
  │      id (PK)
  │      student_id  ← 브라우저 로컬 UUID (익명)
  │      type        ← 'understood' | 'confused' | 'lost'
  │      created_at
  │
  ├─── questions (FK: session_id)
  │      id (PK)
  │      student_id
  │      text
  │      cluster_id  ← AI 군집화 결과 (nullable)
  │      created_at
  │
  ├─── polls (FK: session_id)
  │      id (PK)
  │      question
  │      poll_type   ← 'ox' | 'choice'
  │      options     ← JSONB (["O","X"] 또는 커스텀 선택지)
  │      is_open     ← 투표 진행 여부
  │      created_at
  │      │
  │      └─── poll_votes (FK: poll_id)
  │             id (PK)
  │             student_id
  │             answer
  │             created_at
  │             UNIQUE(poll_id, student_id)  ← 중복 투표 방지
  │
  └─── materials (FK: session_id)
         id (PK)
         file_name
         file_url    ← Supabase Storage 공개 URL
         summary     ← AI 요약 캐시 (nullable)
         created_at
```

### 테이블 상세

#### `sessions` — 수업 세션

```sql
create table sessions (
  id         uuid primary key default gen_random_uuid(),
  code       text unique not null,     -- 학생 참여용 6자리 코드 (예: "ABC123")
  name       text not null,            -- 수업명 (예: "운영체제 3주차")
  created_at timestamptz default now(),
  is_active  boolean default true      -- false: 세션 종료
);

create index idx_sessions_code on sessions(code);
```

**설계 결정**: `code`는 UUID가 아닌 짧은 알파벳+숫자 코드다. 학생이 화이트보드에서 보고 스마트폰에 입력하는 시나리오를 고려했다. UUID는 너무 길다.

#### `responses` — 이해도 신호

```sql
create type response_type as enum ('understood', 'confused', 'lost');

create table responses (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  student_id text not null,      -- 브라우저 localStorage의 UUID (익명)
  type       response_type not null,
  created_at timestamptz default now()
);

create index idx_responses_session on responses(session_id, created_at);
```

**설계 결정**: upsert(최신 상태만 유지) 대신 append-only 방식으로 모든 신호를 저장한다. 이유: 시간대별 이해도 추이 분석(5분 버킷)에 `created_at`이 필수적이다. 리포트에서 "14:30에 혼란이 집중됐다"는 분석이 가능한 이유다.

#### `questions` — 학생 질문

```sql
create table questions (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  student_id text not null,
  text       text not null,
  cluster_id int,               -- AI 군집화 전: NULL, 후: 그룹 번호
  created_at timestamptz default now()
);

create index idx_questions_session on questions(session_id, created_at);
```

**설계 결정**: `cluster_id`는 nullable integer다. 군집화 전에는 NULL, 군집화 후 동일 그룹 질문들은 같은 정수값을 갖는다. 단독 질문은 군집화 대상에서 제외되어 NULL을 유지한다.

#### `polls` — 실시간 투표/퀴즈

```sql
create table polls (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  question   text not null,
  poll_type  text not null default 'ox',  -- 'ox' | 'choice'
  options    jsonb not null default '["O", "X"]',
  is_open    boolean default true,
  created_at timestamptz default now()
);
```

**설계 결정**: 선택지를 JSONB로 저장한 이유는 OX(2개)와 객관식(n개)을 동일 테이블에서 처리하기 위함이다. 별도 테이블로 정규화하면 조회 복잡도가 높아진다.

#### `poll_votes` — 투표 응답

```sql
create table poll_votes (
  id         uuid primary key default gen_random_uuid(),
  poll_id    uuid not null references polls(id) on delete cascade,
  student_id text not null,
  answer     text not null,
  created_at timestamptz default now(),
  unique(poll_id, student_id)  -- 학생당 1회만 투표 가능
);
```

**설계 결정**: `UNIQUE(poll_id, student_id)` 제약으로 DB 레벨에서 중복 투표를 방지한다. 클라이언트 검증에만 의존하지 않는다.

### RLS (Row Level Security) 정책

현재는 공모전 데모용 오픈 정책을 사용한다:

```sql
-- 예시: responses 테이블
create policy "Anyone can read responses"  on responses for select using (true);
create policy "Anyone can create responses" on responses for insert with check (true);
```

**프로덕션 전환 시** 다음으로 강화해야 한다:
```sql
-- 교수만 자신의 세션 데이터를 읽을 수 있음
create policy "Owner can read session responses"
  on responses for select
  using (
    session_id in (
      select id from sessions where owner_id = auth.uid()
    )
  );
```

---

## 4. API 엔드포인트 명세

### `POST /api/cluster`

**목적**: 세션의 미군집 질문을 AI로 군집화

**요청**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**처리 흐름**
```
1. questions 테이블에서 cluster_id IS NULL인 질문 조회
2. Claude API로 군집화 시도 (ANTHROPIC_API_KEY 있을 때)
   - 프롬프트: 한국어 질문 목록 + JSON 응답 형식 지정
   - 모델: claude-3-5-haiku-20241022, max_tokens: 1024
3. API 실패 시: 키워드 오버랩 알고리즘으로 폴백
4. 2개 미만 클러스터 제거 (단독 질문 제외)
5. 기존 최대 cluster_id 조회 후 연속 ID 할당
6. questions 테이블 UPDATE
```

**응답**
```json
{ "clustered": 5 }
```

**에러**
```json
{ "error": "sessionId required" }  // 400
```

---

### `POST /api/summarize`

**목적**: PDF 강의자료 AI 요약 생성 및 캐시

**요청**
```json
{
  "materialId": "550e8400-e29b-41d4-a716-446655440001"
}
```

**처리 흐름**
```
1. materials 테이블에서 materialId 조회
2. summary가 이미 있으면 즉시 반환 (캐시 히트)
3. Claude API에 PDF URL을 document 타입으로 전달
   - 모델: claude-3-5-haiku-20241022, max_tokens: 2048
   - 입력: { type: "document", source: { type: "url", url: fileUrl } }
4. 요약 생성 후 materials 테이블에 저장 (이후 요청 즉시 반환)
5. 요약 반환
```

**응답**
```json
{
  "summary": "# 핵심 주제\n운영체제의 프로세스 스케줄링...\n\n## 주요 개념\n- FCFS: ...\n- SJF: ..."
}
```

**특이사항**: `export const maxDuration = 60;` — PDF 처리 시간을 고려해 Vercel 함수 타임아웃 60초로 설정.

---

### `GET /api/report?sessionId={id}`

**목적**: 세션의 전체 통계 + AI 리포트 생성

**요청**
```
GET /api/report?sessionId=550e8400-e29b-41d4-a716-446655440000
```

**처리 흐름**
```
1. 세션 정보 조회
2. 전체 responses 시간순 조회
3. 전체 questions 조회
4. 통계 계산:
   - 고유 학생 수: Set(student_id).size
   - 타입별 카운트: understood / confused / lost
   - 5분 버킷 타임라인: 구간별 학생 최신 응답 집계
   - 클러스터별 질문 그룹화
5. Claude API로 AI 요약 생성 (컨텍스트: 수업명, 참여자, 응답 분포, 타임라인, 질문 목록)
6. 전체 응답 반환
```

**응답**
```json
{
  "session": {
    "name": "운영체제 3주차",
    "code": "ABC123",
    "createdAt": "2026-04-08T14:00:00Z",
    "isActive": false
  },
  "stats": {
    "uniqueStudents": 42,
    "totalResponses": 187,
    "typeCounts": {
      "understood": 120,
      "confused": 45,
      "lost": 22
    },
    "timeline": [
      { "time": "14:00", "understood": 30, "confused": 5, "lost": 2 },
      { "time": "14:05", "understood": 20, "confused": 15, "lost": 8 }
    ]
  },
  "questions": {
    "total": 23,
    "clusters": [
      {
        "clusterId": 0,
        "count": 7,
        "questions": ["미분이 뭐예요?", "미분 정의 설명해주세요", ...]
      }
    ],
    "unclustered": ["교재 몇 페이지인가요?"]
  },
  "aiSummary": "오늘 수업의 전반적 이해도는 64%로 양호했습니다..."
}
```

---

## 5. Supabase Realtime 채널 구조

각 세션마다 독립적인 채널이 생성되어 다른 세션의 데이터가 섞이지 않는다.

### 채널 목록

| 채널 이름 | 구독 주체 | 이벤트 | 용도 |
|-----------|-----------|--------|------|
| `responses-{sessionId}` | 교수 대시보드 | INSERT | 새 이해도 신호 실시간 반영 |
| `questions-{sessionId}` | 교수 대시보드 | INSERT | 새 질문 실시간 반영 |
| `polls-{sessionId}` | 교수/학생 | INSERT, UPDATE | 투표 생성/종료 알림 |
| `poll-votes-{pollId}` | 교수 대시보드 | INSERT | 실시간 투표 결과 집계 |
| `session-status-{sessionId}` | 학생 | UPDATE | 세션 종료 알림 |

### 구독 코드 패턴

```typescript
// 이해도 신호 구독 (교수 대시보드)
const channel = supabase
  .channel(`responses-${sessionId}`)
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "responses",
      filter: `session_id=eq.${sessionId}`,
    },
    (payload) => {
      // payload.new: { student_id, type, created_at }
      setStudentStates((prev) => {
        const next = new Map(prev);
        next.set(payload.new.student_id, payload.new.type);
        return next;
      });
    }
  )
  .subscribe();

// 컴포넌트 언마운트 시 채널 해제
return () => { supabase.removeChannel(channel); };
```

### Realtime 활성화 SQL

```sql
-- 모든 테이블에 Realtime 발행 설정
alter publication supabase_realtime add table sessions;
alter publication supabase_realtime add table responses;
alter publication supabase_realtime add table questions;
alter publication supabase_realtime add table polls;
alter publication supabase_realtime add table poll_votes;
```

---

## 6. 배포 가이드

### 1단계: Supabase 설정

```bash
# Supabase 프로젝트 생성 후 SQL Editor에서 실행
# 1. 기본 스키마
supabase/schema.sql

# 2. 투표 스키마
supabase/polls.sql

# 3. 강의자료 테이블 (수동 생성)
create table materials (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  file_name  text not null,
  file_url   text not null,
  summary    text,
  created_at timestamptz default now()
);

alter table materials enable row level security;
create policy "Anyone can read materials"  on materials for select using (true);
create policy "Anyone can create materials" on materials for insert with check (true);
create policy "Anyone can update materials" on materials for update using (true);

alter publication supabase_realtime add table materials;
```

### 2단계: Supabase Storage 버킷 생성

Supabase 대시보드 → Storage → New bucket:
- Bucket name: `materials`
- Public bucket: ✓ (PDF URL을 Claude에 직접 전달해야 하므로 공개 필수)

### 3단계: 환경변수 설정

```bash
# .env.local (로컬 개발)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
ANTHROPIC_API_KEY=sk-ant-api03-...
```

### 4단계: Vercel 배포

```bash
# 초기 설정
npm i -g vercel
vercel login
vercel link

# 환경변수 등록
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add ANTHROPIC_API_KEY

# 배포
vercel --prod
```

### 로컬 개발

```bash
npm install
npm run dev
# http://localhost:3000
```

---

## 7. 환경변수 목록

| 변수명 | 필수 여부 | 설명 | 예시 |
|--------|-----------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | **필수** | Supabase 프로젝트 URL. 브라우저에서도 접근하므로 `NEXT_PUBLIC_` 접두사 필요. | `https://abcdefgh.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **필수** | Supabase anon(public) API 키. RLS 정책으로 접근 범위 제한. | `eyJhbGciOiJIUzI1NiIs...` |
| `ANTHROPIC_API_KEY` | 선택 | Claude API 키. 없으면 AI 기능이 폴백 로직으로 동작. | `sk-ant-api03-...` |

### 환경변수 보안 주의사항

- `NEXT_PUBLIC_` 접두사가 붙은 변수는 **브라우저 번들에 포함**된다. Supabase anon key는 RLS로 접근이 제한되므로 공개해도 안전하다.
- `ANTHROPIC_API_KEY`는 서버 사이드에서만 사용된다 (`/api/*` Route Handlers). 절대로 `NEXT_PUBLIC_`을 붙이면 안 된다.
- `.env.local`은 `.gitignore`에 포함되어 있어야 한다.

---

## 8. 성능 고려사항

### 클러스터링 요청 타이밍

`/api/cluster`는 교수가 수동으로 호출한다. 자동 호출이 아닌 이유:
- 질문이 1~2개일 때 클러스터링은 의미 없다.
- API 호출 비용과 응답 시간을 교수가 제어할 수 있어야 한다.
- 적절한 시점(질문이 어느 정도 쌓였을 때)에 한 번 호출하는 것이 효율적이다.

### 요약 캐싱

`/api/summarize`는 결과를 `materials.summary`에 저장한다. 같은 자료에 대한 두 번째 요청은 Claude API를 호출하지 않고 DB에서 즉시 반환한다. PDF 요약은 변하지 않으므로 영구 캐시가 적합하다.

### 리포트 타임라인 집계

5분 버킷 집계는 서버에서 JavaScript로 처리한다. 응답 수가 수천 건이 되면 PostgreSQL 집계 쿼리(GROUP BY, DATE_TRUNC)로 전환하는 것이 효율적이다.

### 인덱스 전략

```sql
-- 세션별 시간순 조회 최적화 (가장 빈번한 쿼리 패턴)
create index idx_responses_session on responses(session_id, created_at);
create index idx_questions_session on questions(session_id, created_at);

-- 참여 코드 조회 최적화 (학생 참여 시 첫 번째 쿼리)
create index idx_sessions_code on sessions(code);

-- 투표 조회 최적화
create index idx_polls_session on polls(session_id, created_at);
create index idx_poll_votes_poll on poll_votes(poll_id);
```
