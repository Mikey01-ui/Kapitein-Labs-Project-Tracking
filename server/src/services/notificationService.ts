import { emailService } from "./emailService.js";
import { prisma } from "./prisma.js";

export async function createNotification(data: {
  recipientId: string;
  title: string;
  message: string;
  type: string;
  link?: string;
}) {
  try {
    const notification = await prisma.notification.create({
      data: {
        recipientId: data.recipientId,
        title: data.title,
        message: data.message,
        type: data.type,
        link: data.link || null,
        isRead: false
      }
    });

    prisma.user.findUnique({
      where: { id: data.recipientId }
    }).then((recipient) => {
      if (recipient && (recipient.notificationEmail || recipient.email)) {
        const targetEmail = recipient.notificationEmail || recipient.email;

        let mailPromise;
        if (data.type === "ACCOUNT_ACTIVATION") {
          mailPromise = emailService.sendAccountApprovalEmail({
            to: targetEmail!,
            userName: recipient.name
          });
        } else {
          const subject = `[Project Tracker] Alert: ${data.title}`;
          const text = `Hello ${recipient.name},\n\nYou have a new notification in your Project Tracker workspace:\n\n${data.message}\n\nType: ${data.type}\nLink: ${data.link ? `http://localhost:5173${data.link}` : "N/A"}\n\nLog in to your dashboard to review it.`;
          
          const html = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #080f1f; color: #ffffff; padding: 24px; border-radius: 12px; max-width: 600px; border: 1px solid #1B2A3F;">
              <h2 style="color: #00e5c8; margin-top: 0; font-weight: 900; tracking-tight: -0.02em;">PROJECT<span style="color: #ffffff;">TRACKER</span></h2>
              <div style="border-top: 1px dashed #1B2A3F; margin: 16px 0;"></div>
              <p style="font-size: 14px; color: #8f98aa;">Hello <strong>${recipient.name}</strong>,</p>
              <p style="font-size: 15px; line-height: 1.6;">You have received a new notification in your workspace inbox:</p>
              
              <div style="background-color: #121e30; border: 1px solid #253347; padding: 18px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #00e5c8; margin-top: 0; margin-bottom: 8px; font-size: 15px;">🔔 ${data.title}</h3>
                <p style="color: #ffffff; font-size: 14px; margin: 0 0 16px 0; line-height: 1.5;">${data.message}</p>
                <span style="font-size: 11px; font-weight: bold; background-color: rgba(0, 229, 200, 0.1); color: #00e5c8; padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(0, 229, 200, 0.2); text-transform: uppercase;">
                  Type: ${data.type.replace(/_/g, ' ')}
                </span>
              </div>

              ${data.link ? `
              <p style="margin: 24px 0; text-align: center;">
                <a href="http://localhost:5173${data.link}" style="background-color: #00e5c8; color: #0b1220; padding: 10px 20px; font-size: 13px; font-weight: bold; border-radius: 6px; text-decoration: none; display: inline-block; text-transform: uppercase; tracking-wider: 0.05em;">
                  Open Workspace
                </a>
              </p>
              ` : ""}

              <p style="font-size: 13px; line-height: 1.6; color: #8f98aa; margin-top: 24px;">Please log in to your dashboard to review pending items and manage active assignments.</p>
              
              <div style="margin-top: 30px; border-top: 1px dashed #1B2A3F; padding-top: 16px; font-size: 11px; color: #8f98aa; text-align: center;">
                This is an automated system alert. Please do not reply directly to this inbox.
              </div>
            </div>
          `;

          mailPromise = emailService.sendMail({
            to: targetEmail!,
            subject,
            text,
            html
          });
        }

        mailPromise.catch(err => {
          console.error(`notificationService: Failed to deliver email for notification ${notification.id} to ${targetEmail}:`, err);
        });
      }
    }).catch(err => {
      console.error(`notificationService: Failed to look up recipient for notification ${notification.id}:`, err);
    });

    return notification;
  } catch (error) {
    console.error("Failed to create database notification:", error);
    return null;
  }
}
