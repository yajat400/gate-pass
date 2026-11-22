# Campus Gate Pass

Campus Gate Pass has separate student, visitor, guard, and admin pages. Students use a saved QR pass. Visitors request access, wait for admin approval, then receive a time-limited QR pass. Guards record entry and exit.

## Live project

- Website: https://yajat400.github.io/gate-pass/

## Visitor flow

1. A visitor enters their name, contact number, host, purpose, requested duration, and a private access code.
2. The admin signs in at `pages/admin.html` and approves or rejects the pending request.
3. When approved, the visitor page displays a QR code and its expiry time.
4. The guard opens the device camera on `pages/guard.html`, scans the visitor QR, checks a photo ID, and records Entry or Exit.
5. The guard portal lists approved visitors. A visitor still marked inside after expiry is highlighted as overdue, with their contact number.

## Files

- `index.html` — student sign-in and registration (main entry page).
- `pages/` — visitor request, guard desk, and admin approval pages.
- `css/style.css` — page layout and styling.
- `js/` — browser code and the public Supabase URL/key configuration.
- `database/` — setup and migration SQL files.
- `BACKEND_SETUP.md` — database setup and private PIN instructions.
- `database/reset_guard_pin.sql` — a reset script with a placeholder for a new private guard PIN.
- `database/fix_guard_login.sql` — a no-secret SQL patch that makes guard login check the same named account updated by the reset script.

The project follows the required layout: `index.html`, `pages/`, `css/`, and `js/`.

The guard camera uses the bundled `html5-qrcode` 2.3.8 library in `js/html5-qrcode.min.js`, so scanning does not depend on a third-party CDN loading. Its Apache 2.0 license is included as `js/HTML5_QR_CODE_LICENSE.txt`. The camera starts only after the guard taps a scan button; the host must use HTTPS and the guard must allow camera access. Student scans suggest Entry when the status is OUT and Exit when the status is IN. The guard checks the physical college ID and confirms the movement before it is saved.

## Security notes

Visitor contact details are private. The database functions expose pending requests only to an admin session and approved visitor details only to a guard session. The admin passphrase and guard PIN must be configured privately in Supabase SQL Editor; never commit them to GitHub. The project is a classroom prototype and does not verify a visitor against an official identity or host roster.

Do not put a Supabase secret or service-role key in browser files. `js/backend-config.js` must contain only the browser-safe publishable/anon key.

## Forgotten guard PIN

The database stores the guard PIN as a hash, so it cannot be displayed or recovered. To replace it, open the Supabase SQL Editor, replace the placeholder in `database/reset_guard_pin.sql` with a new 8-digit PIN, and run the query. Do not commit a real PIN to GitHub.

If the newly reset PIN still returns “incorrect,” run `database/fix_guard_login.sql` in the Supabase SQL Editor. It fixes the login function’s account lookup and does not contain or require a PIN.
