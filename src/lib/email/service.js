import nodemailer from 'nodemailer';
import CustomTemplate from '@/lib/db/models/crm/CustomTemplate';
import { compileTemplate } from '@/lib/template-engine';

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

export const sendTemplatedEmail = async ({ to, organizationId, templateType, templateData, attachments = [] }) => {
    try {
        // Find the custom template for this org and type
        let template = await CustomTemplate.findOne({
            organizationId,
            type: templateType,
            isDefault: true
        });

        // Fallback to non-default if only one exists
        if (!template) {
            template = await CustomTemplate.findOne({ organizationId, type: templateType });
        }

        if (!template) {
            console.warn(`No custom template found for ${templateType} in org ${organizationId}. Using fallback.`);
            // A robust system would have hardcoded default HTML fallbacks here,
            // but for now, we will return an error or a generic message.
            return sendEmail({
                to,
                subject: "System Notification",
                html: "<p>You have a new notification from the HR portal.</p>",
                attachments
            });
        }

        const compiledHtml = compileTemplate(template.content, templateData);
        // We compile the subject too in case it has variables like {{candidate_name}}
        const compiledSubject = compileTemplate(template.subject || "HR Notification", templateData);

        return await sendEmail({
            to,
            subject: compiledSubject,
            html: compiledHtml,
            attachments
        });
    } catch (error) {
        console.error("TEMPLATED EMAIL FAILURE:", error);
        return { success: false, error: error.message };
    }
};
