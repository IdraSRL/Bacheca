<?php
/**
 * newsletter.php
 *
 * Script standalone per invio email HTML + plain-text via POST JSON
 * Ottimizzato per Aruba (mail(), envelope‐sender, multipart)
 */

// ------------------------------------------------------------
// 1. CONFIGURAZIONE
// ------------------------------------------------------------

define('FROM_EMAIL',     'no-replay@nefilim.it');
define('FROM_NAME',      'Bacheca Annunci Pro');

// Forza envelope‐sender
ini_set('sendmail_from', FROM_EMAIL);

define('SEND_DELAY_US',  100000); // 0.1 secondi
define('ALLOWED_ORIGINS','*');
define('ALLOWED_METHODS','POST, OPTIONS');
define('ALLOWED_HEADERS','Content-Type');

// ------------------------------------------------------------
// 2. HEADER E CORS
// ------------------------------------------------------------
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: '  . ALLOWED_ORIGINS);
header('Access-Control-Allow-Methods: ' . ALLOWED_METHODS);
header('Access-Control-Allow-Headers: ' . ALLOWED_HEADERS);

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success'=>false,'error'=>'Metodo non consentito. Usa POST.']);
    exit;
}

// ------------------------------------------------------------
// 3. PROCESSA JSON
// ------------------------------------------------------------
$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    exit(json_encode(['success'=>false,'error'=>'JSON non valido: '.json_last_error_msg()]));
}
if (empty($data['recipients']) || empty($data['subject']) || empty($data['message'])) {
    http_response_code(400);
    exit(json_encode(['success'=>false,'error'=>'Campi mancanti: recipients, subject, message']));
}

$recipients   = $data['recipients'];
$subject      = trim($data['subject']);
$message      = trim($data['message']);
$dashboardUrl = $data['dashboardUrl'] ?? '';

// ------------------------------------------------------------
// 4. HEADER BASE EMAIL
// ------------------------------------------------------------
$baseHeaders = [
    'Return-Path: ' . FROM_EMAIL,
    sprintf('From: %s <%s>', FROM_NAME, FROM_EMAIL),
    'Reply-To: ' . FROM_EMAIL,
    'X-Mailer: PHP/' . phpversion(),
];

// ------------------------------------------------------------
// 5. INVIO EMAIL
// ------------------------------------------------------------
$sentCount = 0;
$errors    = [];

foreach ($recipients as $r) {
    if (empty($r['email']) || empty($r['username'])) {
        $errors[] = 'Recipient malformato';
        continue;
    }
    $email    = $r['email'];
    $username = $r['username'];
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errors[] = "Email non valida: {$email}";
        continue;
    }

    $text = str_replace('[USERNAME]', $username, $message);
    $text = str_replace('[LINK_DASHBOARD]', $dashboardUrl, $text);
    $html = createEmailTemplate($subject, $text, $username, $dashboardUrl);

    // boundary per multipart
    $boundary = md5(uniqid('', true));
    $headers  = $baseHeaders;
    $headers[] = 'MIME-Version: 1.0';
    $headers[] = "Content-Type: multipart/alternative; boundary=\"{$boundary}\"";

    // plain text part
    $plainPart = strip_tags($text);

    // costruisci body multipart
    $body  = "--{$boundary}\r\n";
    $body .= "Content-Type: text/plain; charset=UTF-8\r\n\r\n";
    $body .= $plainPart . "\r\n\r\n";
    $body .= "--{$boundary}\r\n";
    $body .= "Content-Type: text/html; charset=UTF-8\r\n\r\n";
    $body .= $html . "\r\n\r\n";
    $body .= "--{$boundary}--";

    // invia con envelope‐sender
    $ok = mail(
        $email,
        $subject,
        $body,
        implode("\r\n", $headers),
        '-f ' . FROM_EMAIL
    );

    if ($ok) {
        $sentCount++;
        error_log("Newsletter inviata a: {$email} ({$username})");
    } else {
        $errors[] = "Invio fallito a: {$email}";
        error_log("Errore invio newsletter a: {$email} ({$username})");
    }
    usleep(SEND_DELAY_US);
}

// ------------------------------------------------------------
// 6. RISPOSTA JSON
// ------------------------------------------------------------
$response = [
    'success' => $sentCount > 0,
    'sent'    => $sentCount,
    'total'   => count($recipients),
    'errors'  => $errors,
];
if ($sentCount === 0) {
    $response['error'] = 'Nessuna email inviata con successo.';
}
echo json_encode($response);
exit;


/**
 * Genera il template HTML sicuro
 */
function createEmailTemplate(string $subject, string $message, string $username, string $dashboardUrl): string
{
    $messageHtml = nl2br(htmlspecialchars($message, ENT_QUOTES, 'UTF-8'));
    $year        = date('Y');

    // Inizio template
    $html  = <<<HTML
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>{$subject}</title>
  <style>
    body { font-family:Arial,sans-serif; background:#f5f7fa; margin:0; padding:20px; }
    .container { background:#fff; max-width:600px; margin:auto; border-radius:8px; padding:30px; box-shadow:0 2px 5px rgba(0,0,0,0.1); }
    .header h1 { margin:0; color:#4f46e5; font-size:24px; }
    .content p { font-size:16px; line-height:1.5; color:#333; }
    .button { display:inline-block; background:#4f46e5; color:#fff !important; padding:12px 20px; text-decoration:none; border-radius:5px; margin:20px 0; font-weight:bold; }
    .footer { font-size:12px; color:#777; border-top:1px solid #ddd; margin-top:30px; padding-top:20px; text-align:center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>Bacheca Annunci Pro</h1></div>
    <div class="content">
      <p>Ciao <strong>{$username}</strong>,</p>
      <p>{$messageHtml}</p>
HTML;

    // Se ho il link, aggiungo il bottone
    if ($dashboardUrl) {
        $html .= "<p style=\"text-align:center;\"><a href=\"{$dashboardUrl}\" class=\"button\">Visualizza Nuove Offerte</a></p>";
    }

    // Footer e chiusura
    $html .= <<<HTML
    </div>
    <div class="footer">
      <p>Hai ricevuto questa email perché hai attivato le notifiche per le nuove offerte.</p>
      <p>© {$year} Bacheca Annunci Pro. Tutti i diritti riservati.</p>
    </div>
  </div>
</body>
</html>
HTML;

    return $html;
}
