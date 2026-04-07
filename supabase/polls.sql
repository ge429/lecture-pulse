-- 퀴즈/투표 테이블
-- Supabase SQL Editor에서 실행하세요

create table polls (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  question text not null,
  poll_type text not null default 'ox', -- 'ox' | 'choice'
  options jsonb not null default '["O", "X"]',
  is_open boolean default true,
  created_at timestamptz default now()
);

create table poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references polls(id) on delete cascade,
  student_id text not null,
  answer text not null,
  created_at timestamptz default now(),
  unique(poll_id, student_id)
);

create index idx_polls_session on polls(session_id, created_at);
create index idx_poll_votes_poll on poll_votes(poll_id);

alter table polls enable row level security;
alter table poll_votes enable row level security;

create policy "Anyone can read polls" on polls for select using (true);
create policy "Anyone can create polls" on polls for insert with check (true);
create policy "Anyone can update polls" on polls for update using (true);

create policy "Anyone can read poll_votes" on poll_votes for select using (true);
create policy "Anyone can create poll_votes" on poll_votes for insert with check (true);

alter publication supabase_realtime add table polls;
alter publication supabase_realtime add table poll_votes;
