-- Lessons shown in the app. Anyone can read them; only the admin server function
-- (which uses the service role key and checks the admin password) can change them.

create table if not exists public.lessons (
  id text primary key,
  instrument text not null check (instrument in ('piano', 'guitar', 'voice')),
  title text not null,
  description text not null default '',
  level smallint not null default 1 check (level between 1 and 3),
  steps jsonb not null,
  position integer not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists lessons_instrument_position on public.lessons (instrument, position);

alter table public.lessons enable row level security;

drop policy if exists "Anyone can read lessons" on public.lessons;
create policy "Anyone can read lessons" on public.lessons for select using (true);
