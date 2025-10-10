<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require 'PHPMailer-master/src/Exception.php';
require 'PHPMailer-master/src/PHPMailer.php';
require 'PHPMailer-master/src/SMTP.php';

if ($_SERVER["REQUEST_METHOD"] === "POST") {

    $mail = new PHPMailer(true);

    try {
        // Настройки SMTP
        $mail->isSMTP();
        $mail->Host = 'mail.ai-rpa.ru';
        $mail->SMTPAuth = true;
        $mail->Username = 'no-reply@ai-rpa.ru'; // логин почты
        $mail->Password = 'ТВОЙ_ПАРОЛЬ'; // пароль от почтового ящика
        $mail->SMTPSecure = 'ssl';
        $mail->Port = 465;
        $mail->CharSet = 'UTF-8';

        // От кого
        $mail->setFrom('no-reply@ai-rpa.ru', 'Сайт ai-rpa.ru');
        // Кому
        $mail->addAddress('info@ai-rpa.ru');

        // Данные из формы
        $name = htmlspecialchars($_POST['name'] ?? '');
        $phone = htmlspecialchars($_POST['phone'] ?? '');
        $email = htmlspecialchars($_POST['email'] ?? '');
        $message = htmlspecialchars($_POST['message'] ?? '');

        // Письмо
        $mail->isHTML(true);
        $mail->Subject = 'Новое сообщение с сайта ai-rpa.ru';
        $mail->Body = "
            <h3>Новое сообщение с сайта ai-rpa.ru</h3>
            <p><b>Имя:</b> {$name}</p>
            <p><b>Телефон:</b> {$phone}</p>
            <p><b>Email:</b> {$email}</p>
            <p><b>Сообщение:</b><br>" . nl2br($message) . "</p>
        ";

        $mail->send();
        echo "success";

    } catch (Exception $e) {
        echo "Mailer Error: {$mail->ErrorInfo}";
    }
}
?>
