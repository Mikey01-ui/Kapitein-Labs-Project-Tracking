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
      if (recipient) {
        // Collect all notification email addresses (including secondary if present)
        const emailTargets: string[] = [];
        if (recipient.notificationEmail) {
          const splitEmails = recipient.notificationEmail.split(",").map(e => e.trim()).filter(Boolean);
          emailTargets.push(...splitEmails);
        }
        if (recipient.email && !emailTargets.includes(recipient.email)) {
          emailTargets.push(recipient.email);
        }

        if (emailTargets.length === 0) return;

        const clientOrigin = (process.env.CLIENT_ORIGIN || "https://project-tracker.miltomy.com").split(",")[0].trim();
        const linkUrl = data.link ? (data.link.startsWith("http") ? data.link : `${clientOrigin}${data.link}`) : `${clientOrigin}/dashboard`;

        const subject = `[Miltomy] ${data.title}`;
        const text = `Hello ${recipient.name},\n\nYou have an active notification in your Miltomy workspace:\n\n${data.message}\n\nType: ${data.type}\nLink: ${linkUrl}\n\nLog in to your workspace dashboard to review deliverables.`;
        
        const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #080808; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #080808; padding: 40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #111111; border: 1px solid #222222; border-radius: 4px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.8);">
          
          <!-- Header Banner -->
          <tr>
            <td style="padding: 28px 32px; background-color: #0c0c0c; border-bottom: 1px solid #222222;">
              <div style="font-size: 24px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">
                Miltomy<span style="color: #c8ff00;">.</span>
              </div>
              <div style="font-size: 10px; font-weight: 700; color: #888888; text-transform: uppercase; letter-spacing: 0.22em; margin-top: 4px;">
                Agency Client & Project Intelligence
              </div>
            </td>
          </tr>

          <!-- Main Body Content -->
          <tr>
            <td style="padding: 36px 32px 28px 32px;">
              <p style="font-size: 14px; color: #888888; margin: 0 0 16px 0;">
                Hello <strong style="color: #ffffff;">${recipient.name}</strong>,
              </p>
              
              <h2 style="font-size: 20px; font-weight: 800; color: #ffffff; margin: 0 0 12px 0; letter-spacing: -0.2px;">
                ${data.title}
              </h2>
              
              <p style="font-size: 14px; line-height: 1.6; color: #888888; margin: 0 0 24px 0;">
                You have received an active intelligence dispatch on your workspace profile:
              </p>

              <!-- Inner Notification Card -->
              <div style="background-color: #161616; border: 1px solid #262626; border-radius: 4px; padding: 22px; margin-bottom: 28px;">
                <div style="margin-bottom: 8px;">
                  <span style="font-size: 10px; font-weight: 800; color: #c8ff00; text-transform: uppercase; letter-spacing: 0.15em;">
                    Update Details
                  </span>
                </div>
                <p style="color: #ffffff; font-size: 15px; font-weight: 600; line-height: 1.5; margin: 0 0 12px 0;">
                  ${data.message}
                </p>
                <div style="border-top: 1px solid #222222; padding-top: 10px; font-size: 11px; color: #888888;">
                  <strong>Channel:</strong> <span style="color: #c8ff00;">Direct Notification Dispatch</span>
                </div>
              </div>

              <!-- Call to Action Button -->
              <div style="text-align: center; margin: 32px 0 16px 0;">
                <a href="${linkUrl}" style="display: inline-block; background-color: #c8ff00; color: #080808; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.18em; text-decoration: none; padding: 16px 32px; border-radius: 4px; box-shadow: 0 8px 20px rgba(200, 255, 0, 0.15);">
                  Open Workspace &rarr;
                </a>
              </div>

              <p style="font-size: 13px; line-height: 1.6; color: #666666; margin-top: 24px; text-align: center;">
                Please log in to your dashboard to review task requirements, track milestones, and update deliverables.
              </p>
            </td>
          </tr>

          <!-- Footer Bar -->
          <tr>
            <td style="padding: 24px 32px; background-color: #0c0c0c; border-top: 1px solid #222222; text-align: center;">
              <p style="font-size: 11px; color: #666666; margin: 0 0 6px 0;">
                Automated dispatch from <strong style="color: #888888;">notifications@miltomy.com</strong>
              </p>
              <p style="font-size: 10px; color: #444444; margin: 0; text-transform: uppercase; letter-spacing: 0.15em;">
                &copy; ${new Date().getFullYear()} Miltomy Platform. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `;

        // Dispatch email to all target addresses
        for (const email of emailTargets) {
          emailService.sendMail({
            to: email,
            subject,
            text,
            html
          }).catch(err => {
            console.error(`notificationService: Failed to deliver email for notification ${notification.id} to ${email}:`, err);
          });
        }
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
