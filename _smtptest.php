<?php
// TEMPORARY SMTP test endpoint — remove after verifying email works.
// Guarded by a key so it can't be abused to send mail.
require_once __DIR__ . '/config.php';
header('Content-Type: text/plain');

if (($_GET['key'] ?? '') !== 'lbs-smtp-check-9f3c1a7b42') {
    http_response_code(403);
    exit("forbidden\n");
}

// --- outbound connectivity probe: which ports does Railway allow? ---
$probes = [
    'smtp.gmail.com:465', 'smtp.gmail.com:587', 'smtp.gmail.com:25',
    'api.resend.com:443', 'smtp.resend.com:465', 'smtp.resend.com:587', 'smtp.resend.com:2587',
];
echo "=== outbound connectivity probe ===\n";
foreach ($probes as $hp) {
    [$h, $p] = explode(':', $hp);
    $t0 = microtime(true);
    $fp = @fsockopen($h, (int)$p, $errno, $errstr, 8);
    $ms = round((microtime(true) - $t0) * 1000);
    if ($fp) { echo "OPEN   $hp  ({$ms}ms)\n"; fclose($fp); }
    else     { echo "BLOCKED $hp  ($errstr)\n"; }
}
echo "\n";

$to = $_GET['to'] ?? (getenv('SMTP_FROM') ?: 'hello@lbspotlight.com');
echo "SMTP_HOST = " . (getenv('SMTP_HOST') ?: '(unset)') . "\n";
echo "SMTP_PORT = " . (getenv('SMTP_PORT') ?: '(unset)') . "\n";
echo "SMTP_USER = " . (getenv('SMTP_USER') ?: '(unset)') . "\n";
echo "SMTP_FROM = " . (getenv('SMTP_FROM') ?: '(unset)') . "\n";
echo "SMTP_PASS set? " . (getenv('SMTP_PASS') ? 'yes' : 'NO') . "\n";
echo "Sending test to: $to\n\n";

require_once __DIR__ . '/vendor/autoload.php';
$m = new \PHPMailer\PHPMailer\PHPMailer(true);
try {
    $m->isSMTP();
    $m->Host       = getenv('SMTP_HOST');
    $m->Port       = (int)(getenv('SMTP_PORT') ?: 465);
    $m->SMTPAuth   = true;
    $m->Username   = getenv('SMTP_USER');
    $m->Password   = getenv('SMTP_PASS');
    $m->SMTPSecure = ((getenv('SMTP_ENCRYPTION') ?: 'tls') === 'ssl')
        ? \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS
        : \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
    $m->CharSet = 'UTF-8';
    $m->setFrom(getenv('SMTP_FROM'), getenv('SMTP_FROM_NAME') ?: 'LBS');
    $m->addAddress($to);
    $m->Subject = 'LBS Railway SMTP test ' . date('Y-m-d H:i:s');
    $m->Body    = "This is a live test from the Railway deployment.\nIf you received this, outbound email works.";
    $m->send();
    echo "RESULT: SUCCESS — message accepted by the SMTP server.\n";
} catch (\Throwable $e) {
    echo "RESULT: FAILED\n";
    echo "Error: " . $e->getMessage() . "\n";
}
