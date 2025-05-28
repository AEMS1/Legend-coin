<?php
// آدرس ایمیل شما
$to = "mhmdhadym18@gmail.com";

// دریافت اطلاعات فرم
$wallet = $_POST['wallet'];
$points = $_POST['points'];

// موضوع و محتوای ایمیل
$subject = "درخواست برداشت امتیاز از بازی ماینینگ";
$message = "کاربر درخواست برداشت امتیاز داده است:\n\n";
$message .= "آدرس کیف پول: $wallet\n";
$message .= "تعداد امتیاز: $points\n";

// هدرهای ایمیل
$headers = "From: noreply@yourdomain.com";

// ارسال ایمیل
if (mail($to, $subject, $message, $headers)) {
    echo "success";
} else {
    echo "error";
}
?>