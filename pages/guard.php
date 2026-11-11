<?php
require __DIR__ . '/bootstrap.php';
$error = '';
$student = null;
$token = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_csrf();
    if (isset($_POST['logout'])) {
        unset($_SESSION['guard_logged_in']);
        header('Location: guard.php');
        exit;
    }
    if (isset($_POST['pin'])) {
        if (hash_equals((string)$config['guard_pin'], (string)$_POST['pin'])) {
            session_regenerate_id(true);
            $_SESSION['guard_logged_in'] = true;
            header('Location: guard.php');
            exit;
        }
        $error = 'That PIN is not correct.';
    } elseif (!empty($_SESSION['guard_logged_in'])) {
        $token = trim((string)($_POST['token'] ?? ''));
        $lookup = $pdo->prepare('SELECT name, roll_number, gate_status FROM students WHERE qr_token = ?');
        $lookup->execute([$token]);
        $student = $lookup->fetch() ?: null;
        if (!$student) $error = 'QR code not found. Check the scan and try again.';
    }
}
?>
<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Guard Desk | CampusPass</title><link rel="stylesheet" href="../css/style.css"></head>
<body>
  <header class="topbar"><a class="brand" href="../index.php"><span class="brand-mark">C</span> CampusPass</a><nav><a href="../index.php">Student pass</a><a class="active" href="guard.php">Guard desk</a></nav></header>
  <main class="page-wrap narrow">
    <section class="intro"><p class="eyebrow">MAIN GATE</p><h1>Guard desk</h1><p>Scan a pass, check the student's college ID, then record the movement.</p></section>
    <?php if ($error): ?><div class="message error"><?= h($error) ?></div><?php endif; ?>
    <?php if (empty($_SESSION['guard_logged_in'])): ?>
      <section class="panel"><h2>Guard sign-in</h2><p class="muted">Enter the demo PIN configured for this project.</p><form method="post"><input type="hidden" name="csrf" value="<?= h(csrf_token()) ?>"><label for="pin">Guard PIN</label><input id="pin" name="pin" type="password" inputmode="numeric" required><button class="button" type="submit">Continue</button></form></section>
    <?php else: ?>
      <section class="panel"><div class="panel-title"><div><h2>Record a scan</h2><p class="muted">A USB QR scanner types the code into this box.</p></div><form method="post"><input type="hidden" name="csrf" value="<?= h(csrf_token()) ?>"><button class="link-button" name="logout" value="1">Sign out</button></form></div>
        <form method="post" class="scan-form"><input type="hidden" name="csrf" value="<?= h(csrf_token()) ?>"><label for="token">QR token</label><input id="token" name="token" value="<?= h($token) ?>" placeholder="Scan QR or paste token" autocomplete="off" required><button class="button" type="submit">Find student</button></form>
      </section>
      <?php if ($student): ?>
        <section class="panel student-check"><p class="eyebrow">MATCHED STUDENT</p><h2><?= h($student['name']) ?></h2><p class="roll"><?= h($student['roll_number']) ?></p><p>Current gate status: <strong><?= h($student['gate_status']) ?></strong></p><div class="message">Check that the person's physical college ID matches this name and roll number before continuing.</div>
          <form action="process.php" method="post"><input type="hidden" name="csrf" value="<?= h(csrf_token()) ?>"><input type="hidden" name="token" value="<?= h($token) ?>"><label for="movement">Movement</label><select id="movement" name="movement" required><option value="">Choose entry or exit</option><option value="ENTRY">ENTRY — entering campus</option><option value="EXIT">EXIT — leaving campus</option></select><label class="check-row"><input type="checkbox" name="id_checked" value="yes" required> I checked the student's physical college ID.</label><button class="button" type="submit">Confirm scan</button></form>
        </section>
      <?php endif; ?>
    <?php endif; ?>
    <a class="back-link" href="../index.php">← Back to student pass</a>
  </main>
  <footer>CampusPass · Guard station</footer>
</body>
</html>
