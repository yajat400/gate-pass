-- Fix the guard account lookup after changing the PIN.
-- The PIN reset script updates the row named Main Gate Guard; the login
-- function must check that same row instead of an older active guard record.
-- Run this file in Supabase Dashboard > SQL Editor. No PIN is needed here.

create or replace function public.guard_login(p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_guard public.guards%rowtype;
  v_token uuid;
begin
  if length(coalesce(p_pin, '')) < 8 then
    return jsonb_build_object('ok', false, 'error', 'Guard PIN is incorrect.');
  end if;

  select * into v_guard
  from public.guards
  where username = 'Main Gate Guard' and active;

  if not found or extensions.crypt(coalesce(p_pin, ''), v_guard.pin_hash) <> v_guard.pin_hash then
    return jsonb_build_object('ok', false, 'error', 'Guard PIN is incorrect.');
  end if;

  v_token := gen_random_uuid();
  insert into public.app_sessions (token_hash, role, guard_id)
  values (encode(extensions.digest(v_token::text, 'sha256'), 'hex'), 'guard', v_guard.id);

  return jsonb_build_object('ok', true, 'sessionToken', v_token, 'guard', v_guard.username);
end;
$$;
