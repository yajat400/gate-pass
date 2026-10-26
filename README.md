# Campus Gate Pass

A student registers once with their name, college roll number, and a pass code they choose. Their account and QR pass are saved in Supabase for later sign-ins. The student page is hosted on GitHub Pages; guard scans and gate status use the shared database.

## Files

- `index.html` contains student sign-in and one-time registration.
- `guard.html` is the separate guard sign-in and scan page.
- `app.js` connects page actions to the database and refreshes student status.
- `backend-config.js` contains the public Supabase URL and publishable key.
- `supabase_setup.sql` creates the tables and database functions. It does not add sample students.
- `student_registration_migration.sql` updates an existing database with student registration and disables old sample accounts.
- `BACKEND_SETUP.md` explains setup and account use.
- `style.css` controls page layout and colours.

## Student use

1. On the first visit, choose **Create a student account**.
2. Enter your name and college roll number, then choose and confirm a pass code.
3. Your QR pass opens. On later visits, sign in with the same roll number and pass code.

Each roll number can register only once. The account stores a protected pass-code hash, not the pass code itself.

## Guard use

Open `guard.html`, sign in, scan the student's QR, check the physical college ID, and record Entry or Exit. Set a private guard PIN in Supabase before using this outside a classroom project. Do not store guard PINs in this repository.

Do not put Supabase secret or service-role keys in browser files. Student names and roll numbers entered through registration are self-reported; this version does not check them against an official college roster.

