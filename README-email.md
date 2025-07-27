# Sistema di Notifiche Email

## Funzionalità Implementate

### 1. Profilo Utente (Dashboard Cliente)
- **Pulsante "Profilo"** nella header del dashboard
- **Modal delle impostazioni** con:
  - Checkbox "Voglio ricevere email sulle nuove offerte"
  - Campo email (visibile solo se il consenso è attivato)
  - Validazione email
  - Salvataggio nel database Firebase

### 2. Pannello Admin
- **Pulsante "Invia nuove offerte via email"** nella sezione Utenti
- **Tabella utenti aggiornata** con colonna "Email Consenso"
- **Modal di invio email** con:
  - Conteggio destinatari
  - Messaggio personalizzabile
  - Anteprima dell'email

### 3. Backend PHP
- **File `php/send-newsletter.php`** per l'invio delle email
- **Template HTML** professionale per le email
- **Gestione errori** e logging
- **Supporto CORS** per le chiamate AJAX

## Configurazione Email

### Requisiti Server
Il sistema utilizza la funzione `mail()` di PHP. Per il funzionamento in produzione:

1. **Server con supporto mail** (la maggior parte degli hosting lo supporta)
2. **Configurazione SMTP** (opzionale, per migliorare la deliverability)

### Configurazione SMTP (Opzionale)
Per migliorare la deliverability, puoi configurare SMTP nel file `php/send-newsletter.php`:

```php
// Sostituire la funzione mail() con PHPMailer o simili
// Esempio con Gmail SMTP:
$mail = new PHPMailer();
$mail->isSMTP();
$mail->Host = 'smtp.gmail.com';
$mail->SMTPAuth = true;
$mail->Username = 'your-email@gmail.com';
$mail->Password = 'your-app-password';
$mail->SMTPSecure = 'tls';
$mail->Port = 587;
```

## Utilizzo

### Per gli Utenti (Dashboard)
1. Cliccare su "Profilo" nella header
2. Attivare "Voglio ricevere email sulle nuove offerte"
3. Inserire l'indirizzo email
4. Salvare le impostazioni

### Per gli Admin
1. Andare nella sezione "Utenti" del pannello admin
2. Cliccare su "Invia nuove offerte via email"
3. Verificare il numero di destinatari
4. Personalizzare il messaggio (opzionale)
5. Inviare l'email

## Personalizzazione Email

### Template HTML
Il template email include:
- **Header** con logo/nome del sito
- **Messaggio personalizzato** con nome utente
- **Pulsante CTA** per accedere al dashboard
- **Footer** con informazioni legali

### Variabili Disponibili
- `[USERNAME]` - Nome utente del destinatario
- `[LINK_DASHBOARD]` - Link al dashboard (sostituito automaticamente)

## Sicurezza e Privacy

### Consenso GDPR
- ✅ Consenso esplicito dell'utente
- ✅ Possibilità di disattivare le notifiche
- ✅ Email salvata solo con consenso attivo

### Sicurezza
- ✅ Validazione email lato client e server
- ✅ Sanitizzazione input
- ✅ Headers di sicurezza
- ✅ Logging degli invii

## Monitoraggio

### Log degli Invii
Gli invii vengono registrati nel log di PHP:
- Invii riusciti: `Newsletter sent to: email@example.com (username)`
- Invii falliti: `Failed to send newsletter to: email@example.com (username)`

### Statistiche
Il sistema restituisce:
- Numero di email inviate con successo
- Numero totale di destinatari
- Lista degli errori (se presenti)

## Estensioni Future

### Possibili Miglioramenti
1. **Template multipli** per diversi tipi di notifiche
2. **Programmazione invii** (cron job)
3. **Statistiche dettagliate** (aperture, click)
4. **Segmentazione utenti** per invii mirati
5. **Unsubscribe link** automatico