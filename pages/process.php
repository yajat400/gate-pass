<?php
require __DIR__ . '/bootstrap.php';
require_guard();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: guard.php');
    exit;
}
check_csrf();
if (($_POST['id_checked'] ?? '') !== 'yes') {
    header('Location: guard.php');
    exit;
}
$token = trim((string)($_POST['token'] ?? ''));
$movement = (string)($_POST['movement'] ?? '');
if (!in_array($movement, ['ENTRY', 'EXIT'], true)) {
    header('Location: guard.php');
    exit;
}

try {
    $pdo->beginTransaction();
    $find = $pdo->prepare('SELECT id, name, roll_number, gate_status FROM students WHERE qr_token = ? FOR UPDATE');
    $find->execute([$token]);
    $student = $find->fetch();
    if (!$student) throw new RuntimeException('QR code not found.');
    $requiredStatus = $movement === 'ENTRY' ? 'OUT' : 'IN';
    $newStatus = $movement === 'ENTRY' ? 'IN' : 'OUT';
    if ($student['gate_status'] !== $requiredStatus) {
        throw new RuntimeException($movement === 'ENTRY' ? 'This student is already marked inside.' : 'An entry must be recorded before an exit.');
    }
    $update = $pdo->prepare('UPDATE students SET gate_status = ? WHERE id = ?');
    $update->execute([$newStatus, $student['id']]);
    $log = $pdo->prepare('INSERT INTO gate_logs (student_id, movement) VALUES (?, ?)');
    $log->execute([$student['id'], $movement]);
    $pdo->commit();
    $message = $student['name'] . ' (' . $student['roll_number'] . ') — ' . $movement . ' recorded. New status: ' . $newStatus . '.';
} catch (RuntimeException $error) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    $message = $error->getMessage();
} catch (Throwable $error) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    $message = 'The scan could not be saved. Check the database connection.';
}
?>
<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Scan Result | CampusPass</title><link rel="stylesheet" href="../css/style.css"></head>
<body><header class="topbar"><a class="brand" href="../index.php"><span class="brand-mark">C</span> CampusPass</a><nav><a href="../index.php">Student pass</a><a class="active" href="guard.php">Guard desk</a></nav></header><main class="page-wrap narrow"><section class="panel result"><p class="eyebrow">SCAN RESULT</p><h1><?= h($message) ?></h1><a class="button" href="guard.php">Back to guard desk</a></section></main><footer>CampusPass · Gate pass prototype</footer></body></html>
