<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
}

try {
    // Get JSON input
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (!$data) {
        throw new Exception('Invalid JSON data');
    }
    
    // Validate required fields
    if (!isset($data['recipients']) || !isset($data['subject']) || !isset($data['message'])) {
        throw new Exception('Missing required fields');
    }
    
    $recipients = $data['recipients'];
    $subject = $data['subject'];
    $message = $data['message'];
    $dashboardUrl = $data['dashboardUrl'] ?? '';
    
    if (empty($recipients)) {
        throw new Exception('No recipients provided');
    }
    
    // Email configuration
    $fromEmail = 'noreply@bacheca-annunci.com';
    $fromName = 'Bacheca Annunci Pro';
    
    // Email headers
    $headers = [
        'MIME-Version: 1.0',
        'Content-type: text/html; charset=UTF-8',
        'From: ' . $fromName . ' <' . $fromEmail . '>',
        'Reply-To: ' . $fromEmail,
        'X-Mailer: PHP/' . phpversion()
    ];
    
    $sentCount = 0;
    $errors = [];
    
    // Send email to each recipient
    foreach ($recipients as $recipient) {
        if (!isset($recipient['email']) || !isset($recipient['username'])) {
            continue;
        }
        
        $email = $recipient['email'];
        $username = $recipient['username'];
        
        // Validate email
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors[] = "Invalid email: $email";
            continue;
        }
        
        // Personalize message
        $personalizedMessage = str_replace('[LINK_DASHBOARD]', $dashboardUrl, $message);
        $personalizedMessage = str_replace('[USERNAME]', $username, $personalizedMessage);
        
        // Create HTML email body
        $htmlBody = createEmailTemplate($subject, $personalizedMessage, $username, $dashboardUrl);
        
        // Send email
        $success = mail(
            $email,
            $subject,
            $htmlBody,
            implode("\r\n", $headers)
        );
        
        if ($success) {
            $sentCount++;
            
            // Log successful send (optional)
            error_log("Newsletter sent to: $email ($username)");
        } else {
            $errors[] = "Failed to send to: $email";
            error_log("Failed to send newsletter to: $email ($username)");
        }
        
        // Small delay to avoid overwhelming the mail server
        usleep(100000); // 0.1 seconds
    }
    
    // Return results
    $response = [
        'success' => $sentCount > 0,
        'sent' => $sentCount,
        'total' => count($recipients),
        'errors' => $errors
    ];
    
    if ($sentCount === 0) {
        $response['error'] = 'No emails were sent successfully';
    }
    
    echo json_encode($response);
    
} catch (Exception $e) {
    error_log('Newsletter sending error: ' . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

/**
 * Create HTML email template
 */
function createEmailTemplate($subject, $message, $username, $dashboardUrl) {
    $messageHtml = nl2br(htmlspecialchars($message));
    
    return "
    <!DOCTYPE html>
    <html lang='it'>
    <head>
        <meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <title>$subject</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f8fafc;
            }
            .email-container {
                background-color: white;
                border-radius: 8px;
                padding: 30px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 2px solid #6366f1;
            }
            .header h1 {
                color: #6366f1;
                margin: 0;
                font-size: 24px;
            }
            .content {
                margin-bottom: 30px;
            }
            .cta-button {
                display: inline-block;
                background-color: #6366f1;
                color: white;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 6px;
                font-weight: 600;
                margin: 20px 0;
            }
            .footer {
                text-align: center;
                font-size: 12px;
                color: #666;
                border-top: 1px solid #eee;
                padding-top: 20px;
                margin-top: 30px;
            }
        </style>
    </head>
    <body>
        <div class='email-container'>
            <div class='header'>
                <h1>Bacheca Annunci Pro</h1>
            </div>
            
            <div class='content'>
                <p>Ciao <strong>$username</strong>,</p>
                <p>$messageHtml</p>
                
                " . ($dashboardUrl ? "<p style='text-align: center;'>
                    <a href='$dashboardUrl' class='cta-button'>Visualizza Nuove Offerte</a>
                </p>" : "") . "
            </div>
            
            <div class='footer'>
                <p>Hai ricevuto questa email perché hai attivato le notifiche per le nuove offerte.</p>
                <p>© " . date('Y') . " Bacheca Annunci Pro. Tutti i diritti riservati.</p>
            </div>
        </div>
    </body>
    </html>";
}
?>