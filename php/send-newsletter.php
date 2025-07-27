<?php
/**
 * newsletter.php
 * 
 * Script per invio email HTML personalizzate via POST JSON.
 * 
 * CONFIGURAZIONE:
 * - Definisci qui sotto le costanti per mittente, domini consentiti e limiti.
 * - Personalizza il template HTML nel metodo `createEmailTemplate()`.
 */

// ------------------------------------------------------------
// 1. CONFIGURAZIONE
// ------------------------------------------------------------

// Email del mittente (DEVE essere un dominio autorizzato dal tuo SMTP/server)
const FROM_EMAIL = 'no-replay@artigea.it';
const FROM_NAME  = 'Bacheca Annunci Pro';

// CORS: Origini consentite (*) oppure specifica il tuo dominio es. 'https://tuosito.com'
const ALLOWED_ORIGINS  = '*';
const ALLOWED_METHODS  = 'GET, POST, OPTIONS';
const ALLOWED_HEADERS  = 'Content-Type';

// Ritardo (microsecondi) tra invii per non sovraccaricare il server mail
const SEND_DELAY_US    = 100000; // 0.1 secondi

// ------------------------------------------------------------
// 2. IMPOSTAZIONE HEADER E CORS
// ------------------------------------------------------------
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: '  . ALLOWED_ORIGINS);
header('Access-Control-Allow-Methods: ' . ALLOWED_METHODS);
header('Access-Control-Allow-Headers: ' . ALLOWED_HEADERS);

// Rispondi subito alle richieste preflight CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Consentiamo solo POST per l’invio newsletter
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'error'   => 'Metodo non consentito. Usa POST.'
    ]);
    exit();
}

// ------------------------------------------------------------
// 3. ELABORAZIONE DEL BODY JSON
// ------------------------------------------------------------
try {
    // Leggi il raw body e decodifica JSON
    $input = file_get_contents('php://input');
    $data  = json_decode($input, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('JSON non valido: ' . json_last_error_msg());
    }

    // Controlla campi obbligatori
    if (empty($data['recipients']) || empty($data['subject']) || empty($data['message'])) {
        throw new Exception('Campi obbligatori mancanti: recipients, subject, message');
    }

    $recipients   = $data['recipients'];      // Array di ['email'=>'...', 'username'=>'...']
    $subject      = trim($data['subject']);   // Oggetto dell’email
    $message      = trim($data['message']);   // Corpo del messaggio (testo semplice con placeholder)
    $dashboardUrl = $data['dashboardUrl'] ?? ''; // Placeholder opzionale per link

    // ------------------------------------------------------------
    // 4. PREPARAZIONE HEADER EMAIL
    // ------------------------------------------------------------
    $headers = [
        'MIME-Version: 1.0',
        'Content-type: text/html; charset=UTF-8',
        "From: ".FROM_NAME." <".FROM_EMAIL.">",
        "Reply-To: ".FROM_EMAIL,
        "X-Mailer: PHP/".phpversion()
    ];

    // ------------------------------------------------------------
    // 5. INVIO EMAIL
    // ------------------------------------------------------------
    $sentCount = 0;
    $errors    = [];

    foreach ($recipients as $recipient) {
        // Verifica struttura recipient
        if (empty($recipient['email']) || empty($recipient['username'])) {
            $errors[] = 'Recipient malformato, skip.';
            continue;
        }

        $email    = $recipient['email'];
        $username = $recipient['username'];

        // Validazione email
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors[] = "Email non valida: {$email}";
            continue;
        }

        // Sostituisci placeholder nel messaggio
        $personalizedMessage = str_replace('[USERNAME]', $username, $message);
        $personalizedMessage = str_replace('[LINK_DASHBOARD]', $dashboardUrl, $personalizedMessage);

        // Genera HTML completo
        $htmlBody = createEmailTemplate($subject, $personalizedMessage, $username, $dashboardUrl);

        // Invia mail
        $ok = mail(
            $email,
            $subject,
            $htmlBody,
            implode("\r\n", $headers)
        );

        if ($ok) {
            $sentCount++;
            error_log("Newsletter inviata a: {$email} ({$username})");
        } else {
            $errors[] = "Invio fallito a: {$email}";
            error_log("Errore invio newsletter a: {$email} ({$username})");
        }

        // Piccola pausa tra le email
        usleep(SEND_DELAY_US);
    }

    // ------------------------------------------------------------
    // 6. RISPOSTA JSON
    // ------------------------------------------------------------
    $response = [
        'success' => ($sentCount > 0),
        'sent'    => $sentCount,
        'total'   => count($recipients),
        'errors'  => $errors
    ];

    if ($sentCount === 0) {
        $response['error'] = 'Nessuna email inviata con successo.';
    }

    echo json_encode($response);

} catch (Exception $e) {
    // In caso di errore imprevisto
    error_log('Errore invio newsletter: ' . $e->getMessage());

    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => $e->getMessage()
    ]);
    exit();
}

/**
 * Genera il template HTML per l’email.
 * Qui puoi modificare stile, loghi, colori, footer, ecc.
 *
 * @param string $subject Oggetto email
 * @param string $message Corpo del messaggio (HTML già convertito)
 * @param string $username Nome utente del destinatario
 * @param string $dashboardUrl URL facoltativo per CTA
 * @return string HTML completo dell’email
 */
function createEmailTemplate(string $subject, string $message, string $username, string $dashboardUrl): string
{
    // Converti a HTML sicuro
    $messageHtml = nl2br(htmlspecialchars($message, ENT_QUOTES, 'UTF-8'));

    // Anno attuale per il footer
    $year = date('Y');

    return <<<HTML
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1.0">
    <title>{$subject}</title>
    <style>
        /* Imposta uno stile base: personalizza colori e font */
        body {
            font-family: Arial, sans-serif;
            background-color: #f5f7fa;
            margin: 0;
            padding: 20px;
        }
        .container {
            background: #ffffff;
            max-width: 600px;
            margin: auto;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .header h1 {
            margin: 0;
            color: #4f46e5;
            font-size: 24px;
        }
        .content p {
            font-size: 16px;
            line-height: 1.5;
            color: #333333;
        }
        .button {
            display: inline-block;
            background-color: #4f46e5;
            color: #ffffff !important;
            padding: 12px 20px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
        }
        .footer {
            font-size: 12px;
            color: #777777;
            border-top: 1px solid #dddddd;
            margin-top: 30px;
            padding-top: 20px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- HEADER -->
        <div class="header">
            <h1>Bacheca Annunci Pro</h1>
        </div>

        <!-- CORPO MESSAGGIO -->
        <div class="content">
            <p>Ciao <strong>{$username}</strong>,</p>
            <p>{$messageHtml}</p>
HTML
        // Aggiungi il bottone solo se c'è il link
        . ($dashboardUrl
            ? "<p style=\"text-align:center;\">
                 <a href=\"{$dashboardUrl}\" class=\"button\">Visualizza Nuove Offerte</a>
               </p>"
            : "")
        . <<<HTML
        </div>

        <!-- FOOTER -->
        <div class="footer">
            <p>Hai ricevuto questa email perché hai attivato le notifiche per le nuove offerte.</p>
            <p>© {$year} Bacheca Annunci Pro. Tutti i diritti riservati.</p>
        </div>
    </div>
</body>
</html>
HTML;
}
