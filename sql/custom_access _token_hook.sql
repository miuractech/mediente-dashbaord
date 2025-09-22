-- Create the auth hook function
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  user_role public.app_role;
  dep_id uuid;
  proj_id uuid;
begin
  -- Fetch the user role in the user_roles table
  select role, dep_id, proj_id
  into user_role, dep_id, proj_id
  from public.user_roles
  where user_id = (event->>'user_id')::uuid
  limit 1;

  claims := coalesce(event->'claims', '{}'::jsonb);

  -- Set user_role claim
  if user_role is not null then
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role::text));
  else
    claims := jsonb_set(claims, '{user_role}', 'null'::jsonb);
  end if;

  -- Set department_id claim
  if dep_id is not null then
    claims := jsonb_set(claims, '{department_id}', to_jsonb(dep_id));
  else
    claims := jsonb_set(claims, '{department_id}', 'null'::jsonb);
  end if;

  -- Set project_id claim
  if proj_id is not null then
    claims := jsonb_set(claims, '{project_id}', to_jsonb(proj_id));
  else
    claims := jsonb_set(claims, '{project_id}', 'null'::jsonb);
  end if;

  -- Update the 'claims' object in the original event
  event := jsonb_set(event, '{claims}', claims);

  -- Return the modified event
  return event;
end;
$$;

-- Permissions
grant usage on schema public to supabase_auth_admin;

grant execute
  on function public.custom_access_token_hook
  to supabase_auth_admin;

revoke execute
  on function public.custom_access_token_hook
  from authenticated, anon, public;

grant select
  on table public.user_roles
  to supabase_auth_admin;

revoke all
  on table public.user_roles
  from authenticated, anon, public;
