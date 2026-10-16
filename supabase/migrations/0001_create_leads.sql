-- Gleam Detail Co. lead database
create table if not exists public.leads (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  email          text not null,
  phone          text not null,
  vehicle        text not null,
  service        text not null,
  preferred_date date not null,
  ai_response    text,
  ai_mode        text not null default 'demo'
                 check (ai_mode in ('live', 'demo', 'failed')),
  status         text not null default 'New'
                 check (status in ('New', 'Responded', 'Follow-up Needed', 'Followed Up')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_status_idx on public.leads (status);

-- Lock the table down: only the server (service-role key, which bypasses RLS) may read/write.
-- No policies are defined on purpose, so the public anon key can do nothing.
alter table public.leads enable row level security;
