require("dotenv").config();

const transporter = require("./config/mailer");

async function testEmail() {
    try {
        const info = await transporter.sendMail({
            from: `"Eventiqa Attendance" <${process.env.MAIL_USER}>`,
            to: "dcheran3@gmail.com",
            subject: "Eventiqa Attendance - Email Test",
            text: `This is a test email from the Eventiqa Attendance System.

Email configuration is working successfully.`
        });

        console.log("EMAIL SENT SUCCESSFULLY");
        console.log("Message ID:", info.messageId);

    } catch (error) {
        console.error("EMAIL FAILED");
        console.error(error);
    }
}

testEmail();