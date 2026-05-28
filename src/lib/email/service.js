import nodemailer from 'nodemailer';

const getTransporter = () => {
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        return null;
    }
    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT || 587,
        secure: process.env.EMAIL_PORT == 465,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
};

export const sendEmail = async ({ to, subject, html, attachments = [] }) => {
    try {
        const transporter = getTransporter();

        if (!transporter) {
            console.log("\n=======================================================");
            console.log("📨 [DEVELOPMENT MOCK EMAIL] (SMTP credentials missing in .env)");
            console.log(`Recipient: ${to}`);
            console.log(`Subject:   ${subject}`);
            console.log("-------------------------------------------------------");
            console.log("Mocking email success. Configured real SMTP in your .env");
            console.log("file to dispatch real transactional emails.");
            console.log("=======================================================\n");

            return { 
                success: true, 
                messageId: `mock-id-${Date.now()}` 
            };
        }

        const info = await transporter.sendMail({
            from: `"HR Portal" <${process.env.EMAIL_USER}>`,
            to,
            bcc: process.env.EMAIL_USER,
            subject,
            html,
            attachments
        });
        console.log("Email sent successfully: %s", info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error("CRITICAL EMAIL FAILURE:", error);
        return { success: false, error: error.message };
    }
};
