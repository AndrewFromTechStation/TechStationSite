<?php
if ($_SERVER["REQUEST_METHOD"] === "POST") {

    // Кому отправляем
    $to = "info@ai-rpa.ru"; // ← сюда придёт письмо
    $subject = "Новое сообщение с сайта ai-rpa.ru";

    // Получаем данные формы
    $name = htmlspecialchars($_POST['name'] ?? '');
    $phone = htmlspecialchars($_POST['phone'] ?? '');
    $email = htmlspecialchars($_POST['email'] ?? '');
    $message = htmlspecialchars($_POST['message'] ?? '');

    // Формируем тело письма
    $body = "Имя: $name\n";
    $body .= "Телефон: $phone\n";
    $body .= "Email: $email\n\n";
    $body .= "Сообщение:\n$message\n";

    // Заголовки письма
    $headers = "From: no-reply@ai-rpa.ru\r\n";
    $headers .= "Reply-To: $email\r\n";
    $headers .= "Content-Type: text/plain; charset=utf-8\r\n";

    // Отправляем письмо
    if (mail($to, $subject, $body, $headers)) {
        echo "success";
    } else {
        echo "error";
    }
}
?>
