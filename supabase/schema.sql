-- Lecture Pulse DB Schema
-- Supabase SQL Editor에서 실행하세요

-- 1. 이해도 신호 타입
create type response_type as enum ('understood', 'confused', 'lost');

-- 2. 수업 세션
create table sessions (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  created_at timestamptz default now(),
  is_active boolean default true
);

-- 3. 이해도 신호
create table responses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  student_id text not null,
  type response_type not null,
  created_at timestamptz default now()
);

-- 4. 질문
create table questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  student_id text not null,
  text text not null,
  cluster_id int,
  created_at timestamptz default now()
);

-- 인덱스
create index idx_responses_session on responses(session_id, created_at);
create index idx_questions_session on questions(session_id, created_at);
create index idx_sessions_code on sessions(code);

-- RLS (Row Level Security) 활성화
alter table sessions enable row level security;
alter table responses enable row level security;
alter table questions enable row level security;

-- 공개 접근 정책 (anon key로 누구나 읽기/쓰기 가능)
-- 공모전용 간소화 정책 — 프로덕션에서는 인증 기반으로 변경 필요
create policy "Anyone can read sessions" on sessions for select using (true);
create policy "Anyone can create sessions" on sessions for insert with check (true);
create policy "Anyone can update sessions" on sessions for update using (true);

create policy "Anyone can read responses" on responses for select using (true);
create policy "Anyone can create responses" on responses for insert with check (true);

create policy "Anyone can read questions" on questions for select using (true);
create policy "Anyone can create questions" on questions for insert with check (true);

-- Realtime 활성화
alter publication supabase_realtime add table responses;
alter publication supabase_realtime add table questions;
