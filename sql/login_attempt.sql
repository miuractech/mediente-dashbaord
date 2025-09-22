create table public.login_attempts (
  id uuid not null default gen_random_uuid (),
  email text not null,
  ip_address text null,
  success boolean null default false,
  attempted_at timestamp with time zone null default now(),
  user_agent text null,
  error_message text null,
  constraint login_attempts_pkey primary key (id)
) TABLESPACE pg_default;ß