# Campus Gate Pass setup

The browser pages use the Supabase project configured in `js/backend-config.js`. This branch adds a visitor pass flow to the existing student and guard system.

## Apply the visitor database migration

For the existing Campus Gate Pass project:

1. Open Supabase Dashboard → SQL Editor.
2. Run `database/visitor_pass_migration.sql` once.
3. Run the private PIN setup SQL below after replacing both placeholders.

For a completely new Supabase project, run `database/supabase_setup.sql` once, then run the private PIN setup SQL below.

### Private PIN setup

The visitor feature handles contact details. Before using it with real visitors, configure private credentials directly in the Supabase SQL Editor. Replace the quoted placeholder strings below with your own values, then run the statements. Do not put your chosen credentials into this repository or GitHub.

The guard PIN must be at least 8 characters. The admin passphrase must be at least 12 characters.

```sql
insert into public.guards (username, pin_hash)
values ('Main Gate Guard', extensions.crypt('REPLACE_WITH_PRIVATE_8PLUS_GUARD_PIN', extensions.gen_salt('bf')))
on conflict (username) do update
set pin_hash = excluded.pin_hash, active = true;

insert into public.visitor_admins (display_name, pin_hash)
values ('Campus Admin', extensions.crypt('REPLACE_WITH_PRIVATE_12PLUS_ADMIN_PASSPHRASE', extensions.gen_salt('bf')))
on conflict (display_name) do update
set pin_hash = excluded.pin_hash, active = true;
```

This changes the existing demo guard PIN. The previous public classroom PIN 2468 is rejected by this branch's guard login function because it is too short.

## Visitor workflow

- Visitors submit their name, phone, host, reason, requested duration, and a private access code at `pages/visitor.html`.
- The visitor receives a request number and can return with that number and access code.
- An admin signs in at `pages/admin.html` and approves or rejects the request.
- Approval starts the requested visit duration. The visitor then sees a QR pass that the guard can scan from `pages/guard.html`.
- The guard verifies a photo ID and records Entry or Exit. Expired passes still marked inside appear as overdue with contact details.
- The guard view refreshes visitor status approximately every 20 seconds.

## Existing student and guard pages

- Student sign-in and registration remain on `index.html`.
- Student and visitor scans are separate sections in `pages/guard.html`.
- The admin portal is `pages/admin.html`.
- `js/backend-config.js` contains the browser-safe Supabase Project URL and publishable/anon key. Never use a service-role key in browser code.

The database stores pass codes as hashes. Student names/roll numbers and visitor details are self-reported and are not checked against an official college roster. This remains a classroom prototype, not a production identity verification system.
