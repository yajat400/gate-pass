-- Replace the placeholder below with your new private PIN (at least 8 digits).
-- Run this only in your Supabase SQL Editor. Do not commit your real PIN to GitHub.

insert into public.guards (username, pin_hash)
values (
  'Main Gate Guard',
  extensions.crypt('REPLACE_WITH_YOUR_NEW_8_DIGIT_PIN', extensions.gen_salt('bf'))
)
on conflict (username) do update
set pin_hash = excluded.pin_hash, active = true;
