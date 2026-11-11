<?php
require __DIR__ . '/bootstrap.php';
$students = $pdo->query('SELECT name, roll_number, qr_token, gate_status FROM students ORDER BY name')->fetchAll();
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CampusPass | Student Pass</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <header class="topbar"><a class="brand" href="index.php"><span class="brand-mark">C</span> CampusPass</a><nav><a class="active" href="index.php">Student pass</a><a href="pages/guard.php">Guard desk</a></nav></header>
  <main class="page-wrap">
    <section class="intro"><p class="eyebrow">COLLEGE GATE PASS</p><h1>Your entry and exit pass</h1><p>Show your QR code at the gate. The guard checks your college ID before recording a scan.</p></section>
    <div class="notice"><strong>Classroom prototype:</strong> These sample passes are visible together for demonstration. A real system would show each student only their own pass.</div>
    <section class="pass-grid" aria-label="Sample student passes">
      <?php foreach ($students as $student): ?>
      <article class="pass-card">
        <div class="pass-head"><div><p class="eyebrow">STUDENT PASS</p><h2><?= h($student['name']) ?></h2><p class="roll"><?= h($student['roll_number']) ?></p></div><span class="status <?= $student['gate_status'] === 'IN' ? 'inside' : '' ?>"><?= h($student['gate_status']) ?></span></div>
        <div class="qr-box"><div class="qr-code" data-token="<?= h($student['qr_token']) ?>"></div></div>
        <p class="pass-hint">Present this code and your physical college ID to the guard.</p>
      </article>
      <?php endforeach; ?>
    </section>
    <section class="how-card"><h2>How the gate scan works</h2><ol><li>Guard scans the QR with a USB QR scanner.</li><li>Student shows their college ID for a name and photo check.</li><li>The guard records ENTRY or EXIT at the desk.</li></ol><a class="button" href="pages/guard.php">Open guard desk</a></section>
  </main>
  <footer>CampusPass · Gate pass prototype</footer>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js" defer></script>
  <script src="js/app.js" defer></script>
</body>
</html>
