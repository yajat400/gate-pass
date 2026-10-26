# Campus Gate Pass setup

The website is already connected to its Supabase project. The frontend is hosted on GitHub Pages, and Supabase stores student accounts, gate status, and scan history.

The existing database has been upgraded with `student_registration_migration.sql`; the old sample accounts are inactive. For a brand-new Supabase project, use the full `supabase_setup.sql` file instead.

## Student registration

- A student opens the student page and selects **Create a student account** once.
- They enter their name, college roll number, and a pass code they choose.
- The database saves the account and creates a unique QR token. The pass code is stored as a hash.
- On later visits, the student signs in with the same roll number and pass code.
- Roll numbers are compared without regard to letter case or surrounding spaces, so a second account with the same roll cannot be created.

Students can use the same account on another phone or computer. They sign in there with their roll number and pass code; the gate status is loaded from the shared database.

## Guard page

Open `guard.html`, sign in with the gate PIN, scan or enter the QR link, check the physical college ID, then record Entry or Exit. Set a private guard PIN in Supabase before deployment. The setup SQL uses a placeholder that must be replaced with a private value before running; never commit the real PIN.

## Supabase setup

For a fresh Supabase project, run `supabase_setup.sql` once in **SQL Editor**. It creates the tables and restricted functions and does not create sample student accounts. For an older project, `student_registration_migration.sql` adds registration and disables old `DEMO/` student rows; it keeps those rows as inactive history.

`backend-config.js` contains the Project URL and browser-safe publishable key. Never place a secret or service-role key in this file or GitHub Pages.

## What each technology does

- HTML provides the forms and pages.
- CSS styles the student and guard pages.
- JavaScript switches between registration and sign-in, draws the QR, and sends requests to Supabase.
- Supabase stores student details and status so another device can read the same information.

Names and roll numbers are self-reported by students in this classroom version. The system does not check them against an official college roster.
