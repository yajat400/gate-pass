-- Upgrade the existing Campus Gate Pass database for one-time student registration.
create unique index if not exists students_roll_normalized_idx on public.students (lower(btrim(roll_number)));
update public.students set active = false where upper(roll_number) like 'DEMO/%';

create or replace function public.student_register(p_name text, p_roll text, p_pass_code text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_student public.students%rowtype; v_token uuid; v_name text; v_roll text; v_pass_code text;
begin
  v_name := btrim(coalesce(p_name, ''));
  v_roll := upper(btrim(coalesce(p_roll, '')));
  v_pass_code := coalesce(p_pass_code, '');
  if length(v_name) < 2 or length(v_name) > 100 then
    return jsonb_build_object('ok', false, 'error', 'Enter a name between 2 and 100 characters.');
  end if;
  if length(v_roll) < 3 or length(v_roll) > 64 then
    return jsonb_build_object('ok', false, 'error', 'Enter a valid college roll number.');
  end if;
  if length(v_pass_code) < 4 or length(v_pass_code) > 64 then
    return jsonb_build_object('ok', false, 'error', 'Your pass code must be between 4 and 64 characters.');
  end if;
  perform pg_advisory_xact_lock(hashtextextended(lower(v_roll), 0));
  if exists (select 1 from public.students where lower(btrim(roll_number)) = lower(v_roll)) then
    return jsonb_build_object('ok', false, 'error', 'An account already exists for that roll number. Sign in instead.');
  end if;
  insert into public.students (name, roll_number, pass_code_hash, qr_token)
  values (v_name, v_roll, extensions.crypt(v_pass_code, extensions.gen_salt('bf')), gen_random_uuid()::text)
  returning * into v_student;
  v_token := gen_random_uuid();
  insert into public.app_sessions (token_hash, role, student_id)
  values (encode(extensions.digest(v_token::text, 'sha256'), 'hex'), 'student', v_student.id);
  return jsonb_build_object('ok', true, 'sessionToken', v_token, 'student', jsonb_build_object(
    'name', v_student.name, 'roll', v_student.roll_number, 'status', v_student.current_status, 'qrToken', v_student.qr_token));
end;
$$;

create or replace function public.guard_history(p_session_token uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_guard_id bigint; v_scans jsonb;
begin
  select se.guard_id into v_guard_id from public.app_sessions se
  where se.token_hash = encode(extensions.digest(p_session_token::text, 'sha256'), 'hex')
    and se.role = 'guard' and se.expires_at > now();
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Guard session expired. Sign in again.');
  end if;
  select coalesce(jsonb_agg(row_data order by scanned_at desc), '[]'::jsonb) into v_scans
  from (
    select jsonb_build_object('name', st.name, 'roll', st.roll_number, 'movement', ev.movement, 'scannedAt', ev.scanned_at) as row_data,
      ev.scanned_at
    from public.gate_events ev join public.students st on st.id = ev.student_id
    where st.active order by ev.scanned_at desc limit 20
  ) recent;
  return jsonb_build_object('ok', true, 'scans', v_scans);
end;
$$;

revoke all on function public.student_register(text, text, text) from public, anon, authenticated;
grant execute on function public.student_register(text, text, text) to anon, authenticated;
revoke all on function public.guard_history(uuid) from public, anon, authenticated;
grant execute on function public.guard_history(uuid) to anon, authenticated;
