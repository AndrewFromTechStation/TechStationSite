<?php

if (!defined('TS_RECAPTCHA_SECRET')) {
    define('TS_RECAPTCHA_SECRET', '6LfcMfMrAAAAAEql6hn7833q8EfMUyp_8XOU1gHI');
}

if (!function_exists('ts_verify_recaptcha')) {
    function ts_verify_recaptcha(string $token, string $expectedAction): bool
    {
        if ($token === '') {
            return false;
        }

        $postFields = [
            'secret' => TS_RECAPTCHA_SECRET,
            'response' => $token,
        ];

        $remoteIp = $_SERVER['REMOTE_ADDR'] ?? '';
        if ($remoteIp !== '') {
            $postFields['remoteip'] = $remoteIp;
        }

        $query = http_build_query($postFields);
        $endpoint = 'https://www.google.com/recaptcha/api/siteverify';
        $responseBody = null;

        if (function_exists('curl_init')) {
            $ch = curl_init($endpoint);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $query);
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);
            $responseBody = curl_exec($ch);
            if ($responseBody === false) {
                curl_close($ch);
                return false;
            }
            curl_close($ch);
        } else {
            $context = stream_context_create([
                'http' => [
                    'method' => 'POST',
                    'header' => "Content-type: application/x-www-form-urlencoded\r\n",
                    'content' => $query,
                    'timeout' => 10,
                ],
            ]);
            $responseBody = @file_get_contents($endpoint, false, $context);
        }

        if ($responseBody === false || $responseBody === null) {
            return false;
        }

        $verification = json_decode($responseBody, true);

        if (!is_array($verification) || empty($verification['success'])) {
            return false;
        }

        if ($expectedAction !== '' && isset($verification['action']) && $verification['action'] !== $expectedAction) {
            return false;
        }

        if (isset($verification['score']) && $verification['score'] < 0.5) {
            return false;
        }

        return true;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $expectedAction = 'ai_agents_form';
    $recaptchaToken = trim($_POST['recaptcha_token'] ?? '');
    $recaptchaAction = trim($_POST['recaptcha_action'] ?? '');

    if ($recaptchaAction !== $expectedAction || !ts_verify_recaptcha($recaptchaToken, $expectedAction)) {
        echo 'Ошибка проверки безопасности.';
        exit;
    }

    $name = htmlspecialchars($_POST['name'] ?? '');
    $phone = htmlspecialchars($_POST['phone'] ?? '');
    $email = htmlspecialchars($_POST['email'] ?? '');
    $message = htmlspecialchars($_POST['message'] ?? '');

    $to = 'info@ai-rpa.ru';
    $subject = 'Новая заявка из формы (со страницы ИИ-агентов)';

    $fromName = 'ai-rpa.ru';
    $fromEmail = 'info@ai-rpa.ru';

    $headers = "From: {$fromName} <{$fromEmail}>\r\n";
    $headers .= "Reply-To: {$email}\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";

    $body = "
        <h3>Новое сообщение с сайта ai-rpa.ru</h3>
        <p><b>Имя:</b> {$name}</p>
        <p><b>Телефон:</b> {$phone}</p>
        <p><b>Email:</b> {$email}</p>
        <p><b>Сообщение:</b><br>" . nl2br($message) . "</p>
    ";

    if (mail($to, $subject, $body, $headers)) {
        echo 'success';
    } else {
        echo 'Ошибка при отправке письма.';
    }
}


