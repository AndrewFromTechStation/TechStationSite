<?php
if ($_SERVER["REQUEST_METHOD"] === "POST") {

    $name = htmlspecialchars($_POST['name'] ?? '');
    $phone = htmlspecialchars($_POST['phone'] ?? '');
    $email = htmlspecialchars($_POST['email'] ?? '');
    $message = htmlspecialchars($_POST['message'] ?? '');

    $to = "jd@ai-rpa.ru";
    $subject = "Новая заявка из формы";

    $fromName = "ai-rpa.ru";
    $fromEmail = "info@ai-rpa.ru";

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
        echo "success";
    } else {
        echo "Ошибка при отправке письма.";
    }
}
?>
