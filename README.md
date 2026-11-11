# CampusPass Gate Pass

CampusPass is a PHP and MySQL college gate-pass prototype. Students display a QR pass, and a guard checks the physical college ID before recording an entry or exit.

## Project layout

```text
index.html          Required root entry page; forwards to the PHP app
index.php           Student pass page
pages/
  guard.php          Guard sign-in and scan page
  process.php        Scan result and status update
css/
  style.css          Responsive page styling
js/
  app.js             QR code rendering
bootstrap.php        Database connection and session helpers
config.example.php   Safe configuration template
schema.sql           Tables and anonymous demo records
```

## Set up locally or on PHP hosting

1. Create a MySQL database and import `schema.sql` in phpMyAdmin.
2. Copy `config.example.php` to `config.php` and enter the database host, database name, username, password, and a private guard PIN. Keep `config.php` out of GitHub.
3. Upload the project files to the website's document root. Keep the `pages`, `css`, and `js` folders in place.
4. Open the website root. The `index.html` entry forwards to `index.php`.
5. Open **Guard desk**. Use the PIN you set in `config.php`.

The QR-code library is loaded from a CDN, so the browser needs an internet connection to render QR images.

## Demo and safety notes

The SQL file uses anonymous demo students. Replace them only with consented test records. A QR code can be copied, so the guard must compare the person's face and physical college ID with the displayed name and roll number. This prototype records that the guard checked the ID; it cannot prove that the check was honest.

The demo page displays both sample passes together. A real deployment needs student accounts and must show each student only their own pass. Use HTTPS, a strong private guard PIN, and a database account limited to this application's database before any real use.
