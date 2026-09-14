<?php
/**
 * Send evaluation report email via cPanel mail (no Firebase Cloud Function required).
 * POST JSON: { to, subject, html, text, pdfBase64, filename }
 * Authorization: Bearer <Firebase ID token>
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Authorization, Content-Type');
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'METHOD_NOT_ALLOWED', 'message' => 'POST only']);
    exit;
}

$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
if (!preg_match('/Bearer\s+(.+)/i', $authHeader, $matches)) {
    http_response_code(401);
    echo json_encode(['error' => 'NOT_LOGGED_IN', 'message' => 'Authentication required']);
    exit;
}

$idToken = trim($matches[1]);
$firebaseApiKey = 'AIzaSyCuFt8kGzq49L4rhSsSgkZUx48aPYIEtcU';

$verifyContext = stream_context_create([
    'http' => [
        'method' => 'POST',
        'header' => 'Content-Type: application/json',
        'content' => json_encode(['idToken' => $idToken]),
        'ignore_errors' => true,
        'timeout' => 20,
    ],
]);

$verifyRaw = @file_get_contents(
    'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' . urlencode($firebaseApiKey),
    false,
    $verifyContext
);

$verify = $verifyRaw ? json_decode($verifyRaw, true) : null;
if (!is_array($verify) || empty($verify['users'])) {
    http_response_code(401);
    echo json_encode(['error' => 'INVALID_TOKEN', 'message' => 'Invalid or expired sign-in']);
    exit;
}

$raw = file_get_contents('php://input');
$payload = json_decode($raw ?: '', true);
if (!is_array($payload)) {
    http_response_code(400);
    echo json_encode(['error' => 'VALIDATION_ERROR', 'message' => 'Invalid JSON body']);
    exit;
}

$to = trim((string) ($payload['to'] ?? ''));
$subject = trim((string) ($payload['subject'] ?? 'EvalScout evaluation'));
$html = trim((string) ($payload['html'] ?? ''));
$text = trim((string) ($payload['text'] ?? ''));
$pdfBase64 = (string) ($payload['pdfBase64'] ?? '');
$filename = trim((string) ($payload['filename'] ?? 'evaluation-report.pdf'));

if ($to === '' || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['error' => 'VALIDATION_ERROR', 'message' => 'Valid recipient email required']);
    exit;
}

if ($filename === '') {
    $filename = 'evaluation-report.pdf';
}
if (!str_ends_with(strtolower($filename), '.pdf')) {
    $filename .= '.pdf';
}

$fromEmail = 'noreply@evalscout.hasthiya.com';
$fromName = 'EvalScout';
$fromHeader = sprintf('%s <%s>', $fromName, $fromEmail);

$bodyText = $text !== '' ? $text : strip_tags(str_replace(['<br>', '<br/>', '<br />'], "\n", $html));
if ($bodyText === '') {
    $bodyText = 'EvalScout evaluation report attached.';
}

$hasPdf = $pdfBase64 !== '';
$pdfBytes = $hasPdf ? base64_decode($pdfBase64, true) : false;
if ($hasPdf && $pdfBytes === false) {
    http_response_code(400);
    echo json_encode(['error' => 'VALIDATION_ERROR', 'message' => 'Invalid PDF attachment']);
    exit;
}

$boundary = 'evalscout_' . bin2hex(random_bytes(8));
$headers = [
    'From: ' . $fromHeader,
    'Reply-To: ' . $fromEmail,
    'MIME-Version: 1.0',
    'X-Mailer: EvalScout-cPanel',
];

if ($hasPdf) {
    $headers[] = 'Content-Type: multipart/mixed; boundary="' . $boundary . '"';
    $message = "--{$boundary}\r\n";
    $message .= "Content-Type: text/html; charset=UTF-8\r\n";
    $message .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
    $message .= ($html !== '' ? $html : '<p>' . htmlspecialchars($bodyText, ENT_QUOTES, 'UTF-8') . '</p>') . "\r\n\r\n";
    $message .= "--{$boundary}\r\n";
    $message .= "Content-Type: application/pdf; name=\"{$filename}\"\r\n";
    $message .= "Content-Transfer-Encoding: base64\r\n";
    $message .= "Content-Disposition: attachment; filename=\"{$filename}\"\r\n\r\n";
    $message .= chunk_split(base64_encode($pdfBytes)) . "\r\n";
    $message .= "--{$boundary}--";
} else {
    $headers[] = 'Content-Type: text/html; charset=UTF-8';
    $message = $html !== '' ? $html : $bodyText;
}

$ok = @mail($to, $subject, $message, implode("\r\n", $headers));
if (!$ok) {
    http_response_code(500);
    echo json_encode([
        'error' => 'EMAIL_FAILED',
        'message' => 'cPanel mail() could not send. Check Email Accounts in cPanel for noreply@evalscout.hasthiya.com',
    ]);
    exit;
}

echo json_encode(['ok' => true, 'method' => 'cpanel-mail']);
