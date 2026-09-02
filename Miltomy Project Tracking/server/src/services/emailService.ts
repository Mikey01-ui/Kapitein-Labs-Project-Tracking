import nodemailer from "nodemailer";
import { prisma } from "./prisma.js";

function buildMiltomyEmailHtml(options: {
  title: string;
  preheader?: string;
  greetingName?: string;
  intro: string;
  highlightBoxHtml: string;
  actionButton?: { text: string; url: string };
  footerNote?: string;
}) {
  const clientOrigin = (process.env.CLIENT_ORIGIN || "https://project-tracker.miltomy.com").split(",")[0].trim();
  const actionBtnUrl = options.actionButton?.url.startsWith("http")
    ? options.actionButton.url
    : `${clientOrigin}${options.actionButton?.url}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.title}</title>
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
              ${options.greetingName ? `<p style="font-size: 14px; color: #888888; margin: 0 0 16px 0;">Hello <strong style="color: #ffffff;">${options.greetingName}</strong>,</p>` : ""}
              
              <h2 style="font-size: 20px; font-weight: 800; color: #ffffff; margin: 0 0 12px 0; letter-spacing: -0.2px;">
                ${options.title}
              </h2>
              
              <p style="font-size: 14px; line-height: 1.6; color: #888888; margin: 0 0 24px 0;">
                ${options.intro}
              </p>

              <!-- Inner Highlight Box -->
              <div style="background-color: #161616; border: 1px solid #262626; border-radius: 4px; padding: 22px; margin-bottom: 28px;">
                ${options.highlightBoxHtml}
              </div>

              <!-- Call to Action Button -->
              ${options.actionButton ? `
                <div style="text-align: center; margin: 32px 0 16px 0;">
                  <a href="${actionBtnUrl}" style="display: inline-block; background-color: #c8ff00; color: #080808; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.18em; text-decoration: none; padding: 16px 32px; border-radius: 4px; box-shadow: 0 8px 20px rgba(200, 255, 0, 0.15);">
                    ${options.actionButton.text} &rarr;
                  </a>
                </div>
              ` : ""}

              ${options.footerNote ? `
                <p style="font-size: 13px; line-height: 1.6; color: #666666; margin-top: 24px; text-align: center;">
                  ${options.footerNote}
                </p>
              ` : ""}
            </td>
          </tr>

          <!-- Footer Bar -->
          <tr>
            <td style="padding: 24px 32px; background-color: #0c0c0c; border-top: 1px solid #222222; text-align: center;">
              <p style="font-size: 11px; color: #666666; margin: 0 0 6px 0;">
                Dispatched from <strong style="color: #888888;">notifications@miltomy.com</strong>
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
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private testAccount: nodemailer.TestAccount | null = null;
  private isTestAccountInitializing = false;

  private async getTransporter(): Promise<nodemailer.Transporter> {
    if (this.transporter) {
      return this.transporter;
    }

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT ?? 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass }
      });
      console.log(`EmailService: Configured SMTP connection to ${host}:${port}`);
      return this.transporter;
    }

    if (this.isTestAccountInitializing) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return this.getTransporter();
    }

    this.isTestAccountInitializing = true;
    try {
      this.testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: this.testAccount.smtp.host,
        port: this.testAccount.smtp.port,
        secure: this.testAccount.smtp.secure,
        auth: {
          user: this.testAccount.user,
          pass: this.testAccount.pass
        }
      });
    } catch (error) {
      console.error("EmailService: Failed to create test transporter, using fallback logger:", error);
      this.transporter = {
        sendMail: async (mailOptions: any) => {
          console.log(`[SMTP CONSOLE] To: ${mailOptions.to} | Subject: ${mailOptions.subject}`);
          return { messageId: "console-fallback-id" };
        }
      } as any;
    } finally {
      this.isTestAccountInitializing = false;
    }

    return this.transporter!;
  }

  public async sendMail(options: { to: string; subject: string; text: string; html: string }) {
    const resendApiKey = process.env.RESEND_API_KEY;
    const from = process.env.SMTP_FROM || "Miltomy <notifications@miltomy.com>";

    if (resendApiKey) {
      try {
        console.log(`EmailService: Dispatching email to ${options.to} via Resend API from ${from}...`);
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${resendApiKey}`
          },
          body: JSON.stringify({
            from,
            to: options.to,
            subject: options.subject,
            text: options.text,
            html: options.html
          })
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Resend API returned status ${res.status}: ${errText}`);
        }

        const data = await res.json() as any;
        console.log(`EmailService: Email successfully sent via Resend API (ID: ${data.id}) to ${options.to}`);
        return { messageId: data.id };
      } catch (error) {
        console.error(`EmailService: Failed to send email via Resend API to ${options.to}, falling back:`, error);
      }
    }

    try {
      const transporter = await this.getTransporter();
      const fallbackFrom = process.env.SMTP_FROM || "Miltomy <notifications@miltomy.com>";
      
      const info = await transporter.sendMail({
        from: fallbackFrom,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html
      });

      console.log(`EmailService: Fallback SMTP dispatched to ${options.to} (ID: ${info.messageId})`);
      return info;
    } catch (error) {
      console.error(`EmailService: Error delivering email to ${options.to}:`, error);
      throw error;
    }
  }

  public async sendTaskAssignmentEmail(options: {
    to: string;
    userName: string;
    taskTitle: string;
    description: string;
    priority: string;
    projectName: string;
    dueDate?: string;
    recipientId?: string;
  }) {
    const clientOrigin = (process.env.CLIENT_ORIGIN || "https://project-tracker.miltomy.com").split(",")[0].trim();
    const subject = `[Miltomy] Task Assigned: ${options.taskTitle}`;
    const text = `Hello ${options.userName},\n\nYou have been assigned a deliverable task on "${options.projectName}":\n\nTask: ${options.taskTitle}\nPriority: ${options.priority}\nDue Date: ${options.dueDate || "Flexible"}\n\nDescription: ${options.description || "No description provided."}\n\nAccess your workspace: ${clientOrigin}/tasks`;

    const highlightBoxHtml = `
      <div style="margin-bottom: 14px;">
        <span style="font-size: 10px; font-weight: 800; color: #c8ff00; text-transform: uppercase; letter-spacing: 0.15em; display: block; margin-bottom: 4px;">
          Deliverable Item
        </span>
        <h3 style="color: #ffffff; margin: 0; font-size: 17px; font-weight: 700;">
          ${options.taskTitle}
        </h3>
      </div>

      <p style="color: #888888; font-size: 13px; line-height: 1.5; margin: 0 0 16px 0;">
        ${options.description || "<em>No additional task specifications provided.</em>"}
      </p>

      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-top: 1px solid #222222; padding-top: 12px;">
        <tr>
          <td>
            <span style="font-size: 10px; color: #888888; text-transform: uppercase; font-weight: 700;">Project Track:</span>
            <span style="font-size: 12px; color: #ffffff; font-weight: 600; margin-left: 6px;">${options.projectName}</span>
          </td>
          <td align="right">
            <span style="display: inline-block; padding: 3px 8px; background-color: #080808; border: 1px solid #262626; border-radius: 3px; font-size: 10px; font-weight: 800; color: #c8ff00; text-transform: uppercase;">
              ${options.priority} Priority
            </span>
          </td>
        </tr>
      </table>
    `;

    const html = buildMiltomyEmailHtml({
      title: "New Task Assignment",
      greetingName: options.userName,
      intro: `You have been allocated to an active deliverable on project <strong style="color: #ffffff;">${options.projectName}</strong>.`,
      highlightBoxHtml,
      actionButton: {
        text: "Open Kanban Task",
        url: "/tasks"
      },
      footerNote: "Please log in to your workspace to review task requirements, initialize checklist items, and submit deliverables."
    });

    return this.sendMailToUserAndAdmins({ to: options.to, subject, text, html });
  }

  public async sendTaskCompletionEmail(options: {
    to: string;
    userName: string;
    taskTitle: string;
    description: string;
    projectName: string;
    completedBy: string;
  }) {
    const subject = `[Miltomy] Deliverable Completed: ${options.taskTitle}`;
    const text = `Hello ${options.userName},\n\nThe deliverable "${options.taskTitle}" on project "${options.projectName}" has been marked as Completed by ${options.completedBy}.\n\nReview task details on the project Kanban board.`;

    const highlightBoxHtml = `
      <div style="margin-bottom: 12px;">
        <span style="font-size: 10px; font-weight: 800; color: #00C88A; text-transform: uppercase; letter-spacing: 0.15em; display: block; margin-bottom: 4px;">
          &#10003; Status: Completed
        </span>
        <h3 style="color: #ffffff; margin: 0; font-size: 16px; font-weight: 700;">
          ${options.taskTitle}
        </h3>
      </div>
      <p style="color: #888888; font-size: 13px; line-height: 1.5; margin: 0 0 14px 0;">
        ${options.description || "<em>Task successfully executed and finalized.</em>"}
      </p>
      <div style="border-top: 1px solid #222222; padding-top: 10px; font-size: 11px; color: #888888;">
        <strong>Resolved By:</strong> <span style="color: #ffffff;">${options.completedBy}</span>
      </div>
    `;

    const html = buildMiltomyEmailHtml({
      title: "Deliverable Marked as Complete",
      greetingName: options.userName,
      intro: `A deliverable item on project <strong style="color: #ffffff;">${options.projectName}</strong> has been completed.`,
      highlightBoxHtml,
      actionButton: {
        text: "View Deliverable",
        url: "/dashboard"
      }
    });

    return this.sendMailToUserAndAdmins({ to: options.to, subject, text, html });
  }

  public async sendProjectAssignmentEmail(options: {
    to: string;
    userName: string;
    projectName: string;
    description: string;
    managerName: string;
    recipientId?: string;
  }) {
    const subject = `[Miltomy] Assigned to Project Workspace: ${options.projectName}`;
    const text = `Hello ${options.userName},\n\nYou have been assigned as a team member on project "${options.projectName}".\n\nProject Lead: ${options.managerName}\nDescription: ${options.description}\n\nLog in to your workspace to review deliverables.`;

    const highlightBoxHtml = `
      <div style="margin-bottom: 12px;">
        <span style="font-size: 10px; font-weight: 800; color: #c8ff00; text-transform: uppercase; letter-spacing: 0.15em; display: block; margin-bottom: 4px;">
          Project Workspace
        </span>
        <h3 style="color: #ffffff; margin: 0; font-size: 17px; font-weight: 700;">
          ${options.projectName}
        </h3>
      </div>
      <p style="color: #888888; font-size: 13px; line-height: 1.5; margin: 0 0 14px 0;">
        ${options.description || "<em>Agency client project track initialized.</em>"}
      </p>
      <div style="border-top: 1px solid #222222; padding-top: 10px; font-size: 11px; color: #888888;">
        <strong>Project Lead:</strong> <span style="color: #ffffff;">${options.managerName}</span>
      </div>
    `;

    const html = buildMiltomyEmailHtml({
      title: "Project Workspace Access Granted",
      greetingName: options.userName,
      intro: `You have been added as a collaborator to <strong style="color: #ffffff;">${options.projectName}</strong>.`,
      highlightBoxHtml,
      actionButton: {
        text: "Open Project Workspace",
        url: "/projects"
      }
    });

    return this.sendMailToUserAndAdmins({ to: options.to, subject, text, html });
  }

  public async sendAccountApprovalEmail(options: {
    to: string;
    userName: string;
  }) {
    const clientOrigin = (process.env.CLIENT_ORIGIN || "https://project-tracker.miltomy.com").split(",")[0].trim();
    const subject = `[Miltomy] Account Approved & Activated`;
    const text = `Hello ${options.userName},\n\nYour agency account has been approved and activated by an administrator.\n\nYou can now sign in at ${clientOrigin}/login`;

    const highlightBoxHtml = `
      <div style="text-align: center; padding: 10px 0;">
        <span style="display: inline-block; width: 44px; height: 44px; line-height: 44px; border-radius: 50%; background-color: rgba(200, 255, 0, 0.1); border: 1px solid rgba(200, 255, 0, 0.25); color: #c8ff00; font-size: 20px; margin-bottom: 12px;">
          &#10003;
        </span>
        <h3 style="color: #ffffff; margin: 0 0 6px 0; font-size: 16px; font-weight: 700;">
          Workspace Profile Active
        </h3>
        <p style="color: #888888; font-size: 13px; margin: 0; line-height: 1.5;">
          You can now sign in with your registered credentials and access assigned client deliverables.
        </p>
      </div>
    `;

    const html = buildMiltomyEmailHtml({
      title: "Account Activated",
      greetingName: options.userName,
      intro: "Your registration request has been approved by the agency administrator.",
      highlightBoxHtml,
      actionButton: {
        text: "Sign In to Miltomy",
        url: "/login"
      }
    });

    return this.sendMail({ to: options.to, subject, text, html });
  }

  public async sendProjectTrlUpdateEmail(options: {
    to: string;
    userName: string;
    projectName: string;
    trlLevel: number;
    justification: string;
    updatedBy: string;
  }) {
    const subject = `[Miltomy] Milestone Advanced: ${options.projectName} (Phase ${options.trlLevel})`;
    const text = `Hello ${options.userName},\n\nProject "${options.projectName}" has been advanced to Phase ${options.trlLevel} by ${options.updatedBy}.\n\nJustification: ${options.justification}`;

    const highlightBoxHtml = `
      <div style="margin-bottom: 12px;">
        <span style="font-size: 10px; font-weight: 800; color: #c8ff00; text-transform: uppercase; letter-spacing: 0.15em; display: block; margin-bottom: 4px;">
          Phase Advancement
        </span>
        <h3 style="color: #ffffff; margin: 0; font-size: 16px; font-weight: 700;">
          Phase ${options.trlLevel} Progress Logged
        </h3>
      </div>
      <p style="color: #888888; font-size: 13px; margin: 0 0 14px 0; line-height: 1.5;">
        <strong>Justification:</strong> ${options.justification}
      </p>
      <div style="border-top: 1px solid #222222; padding-top: 10px; font-size: 11px; color: #888888;">
        <strong>Updated By:</strong> <span style="color: #ffffff;">${options.updatedBy}</span>
      </div>
    `;

    const html = buildMiltomyEmailHtml({
      title: "Project Milestone Advancement",
      greetingName: options.userName,
      intro: `A milestone advancement has been confirmed for <strong style="color: #ffffff;">${options.projectName}</strong>.`,
      highlightBoxHtml,
      actionButton: {
        text: "Review Project Track",
        url: "/projects"
      }
    });

    return this.sendMailToUserAndAdmins({ to: options.to, subject, text, html });
  }

  private async getAdminEmails(): Promise<string[]> {
    try {
      const admins = await prisma.user.findMany({
        where: { role: "OWNER", isActive: true }
      });
      return admins.map(a => a.email).filter(Boolean);
    } catch (err) {
      console.error("EmailService: Failed to fetch admin emails:", err);
      return [];
    }
  }

  public async sendMailToUserAndAdmins(options: { to: string; subject: string; text: string; html: string }) {
    const recipients = [options.to];
    let primaryMessageId = "dispatched";
    
    try {
      const admins = await this.getAdminEmails();
      for (const adminEmail of admins) {
        if (adminEmail && adminEmail.toLowerCase() !== options.to.toLowerCase()) {
          recipients.push(adminEmail);
        }
      }
    } catch (e) {
      console.error("Failed to query admin emails for notification copy:", e);
    }

    const promises = recipients.map(async (email, index) => {
      try {
        const res = await this.sendMail({
          to: email,
          subject: options.subject,
          text: options.text,
          html: options.html
        });
        if (index === 0 && res && typeof res === "object") {
          primaryMessageId = (res as any).messageId || "dispatched";
        }
      } catch (err) {
        console.error(`EmailService: Failed to deliver copy to ${email}:`, err);
      }
    });

    await Promise.allSettled(promises);
    return { messageId: primaryMessageId };
  }
}

export const emailService = new EmailService();

export async function sendEmail(options: { to: string; subject: string; html: string; text?: string }) {
  return emailService.sendMail({
    to: options.to,
    subject: options.subject,
    text: options.text || "",
    html: options.html,
  });
}
