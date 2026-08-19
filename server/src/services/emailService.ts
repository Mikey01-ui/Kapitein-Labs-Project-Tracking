import nodemailer from "nodemailer";
import { prisma } from "./prisma.js";

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
      // Use configured production SMTP server
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass }
      });
      console.log(`EmailService: Configured SMTP connection to ${host}:${port}`);
      return this.transporter;
    }

    // Otherwise, generate a mock Ethereal SMTP account for local testing
    if (this.isTestAccountInitializing) {
      // Wait a bit if another call is currently initializing the test account
      await new Promise((resolve) => setTimeout(resolve, 500));
      return this.getTransporter();
    }

    this.isTestAccountInitializing = true;
    try {
      console.log("EmailService: Generating temporary Ethereal Mail SMTP account for testing...");
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
      console.log(`EmailService: Ethereal test account configured successfully.`);
      console.log(`Ethereal username: ${this.testAccount.user}`);
    } catch (error) {
      console.error("EmailService: Failed to create Ethereal test account, falling back to console log driver:", error);
      // Create a fallback transporter that just logs to console
      this.transporter = {
        sendMail: async (mailOptions: any) => {
          console.log("\n--- [SMTP CONSOLE FALLBACK] ---");
          console.log(`To: ${mailOptions.to}`);
          console.log(`Subject: ${mailOptions.subject}`);
          console.log(`Text: ${mailOptions.text}`);
          console.log("-------------------------------\n");
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
    const from = process.env.SMTP_FROM || "onboarding@resend.dev";

    if (resendApiKey) {
      try {
        console.log(`EmailService: Dispatching notification email to ${options.to} via Resend API...`);
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
        console.log(`EmailService: Email successfully sent via Resend API (ID: ${data.id})`);
        return { messageId: data.id };
      } catch (error) {
        console.error(`EmailService: Failed to send email via Resend API to ${options.to}, falling back to SMTP/Ethereal:`, error);
        // Fall through to SMTP transporter below
      }
    }

    try {
      const transporter = await this.getTransporter();
      const fallbackFrom = process.env.SMTP_FROM || "Project Tracking Platform <noreply@projecttracker.local>";
      
      const info = await transporter.sendMail({
        from: fallbackFrom,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html
      });

      console.log(`EmailService: Notification email successfully dispatched to ${options.to} (MessageID: ${info.messageId})`);

      // If Ethereal test account is active, log the URL to view the styled HTML mail online
      if (this.testAccount) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        console.log(`\n📬 [TEST EMAIL PREVIEW] View the email here: ${previewUrl}\n`);
      }
      return info;
    } catch (error) {
      console.error(`EmailService: Error delivering email to ${options.to}:`, error);
      throw error;
    }
  }

  public async sendProjectTrlUpdateEmail(options: {
    to: string;
    userName: string;
    projectName: string;
    trlLevel: number;
    justification: string;
    updatedBy: string;
  }) {
    const subject = `[Project Tracker] Project TRL Advanced: ${options.projectName} (TRL ${options.trlLevel})`;
    
    const text = `Hello ${options.userName},\n\nThe project "${options.projectName}" has been advanced to Technology Readiness Level ${options.trlLevel} by ${options.updatedBy}.\n\nJustification: ${options.justification}\n\nReview project status and Gantt timeline on the project details page.`;
    
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #080f1f; color: #ffffff; padding: 24px; border-radius: 12px; max-width: 600px; border: 1px solid #1B2A3F;">
        <h2 style="color: #00e5c8; margin-top: 0; font-weight: 900; tracking-tight: -0.02em;">PROJECT<span style="color: #ffffff;">TRACKER</span></h2>
        <div style="border-top: 1px dashed #1B2A3F; margin: 16px 0;"></div>
        <p style="font-size: 14px; color: #8f98aa;">Hello <strong>${options.userName}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.6;">A project milestone advancement has been logged for <strong>${options.projectName}</strong>:</p>
        
        <div style="background-color: #121e30; border: 1px solid #253347; padding: 18px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #00e5c8; margin-top: 0; margin-bottom: 8px; font-size: 16px;">🎯 Advanced to TRL ${options.trlLevel}</h3>
          <p style="color: #8f98aa; font-size: 13px; margin: 0 0 16px 0; line-height: 1.5;"><strong>Justification:</strong> ${options.justification}</p>
          <span style="font-size: 11px; font-weight: bold; background-color: rgba(0, 229, 200, 0.1); color: #00e5c8; padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(0, 229, 200, 0.2);">
            Updated By: ${options.updatedBy}
          </span>
        </div>

        <p style="font-size: 14px; line-height: 1.6; color: #8f98aa;">You can review the TRL history and the planning Gantt timeline on the project detail page.</p>
        
        <div style="margin-top: 30px; border-top: 1px dashed #1B2A3F; padding-top: 16px; font-size: 11px; color: #8f98aa; text-align: center;">
          This is an automated system alert. Please do not reply directly to this inbox.
        </div>
      </div>
    `;

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
    const subject = `[Project Tracker] Assigned to New Project: ${options.projectName}`;
    
    const text = `Hello ${options.userName},\n\nYou have been assigned as a team member on the project "${options.projectName}".\n\nProject Manager: ${options.managerName}\nDescription: ${options.description}\n\nLog in to your workspace dashboard to review active tasks.`;
    
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #080f1f; color: #ffffff; padding: 24px; border-radius: 12px; max-width: 600px; border: 1px solid #1B2A3F;">
        <h2 style="color: #00e5c8; margin-top: 0; font-weight: 900; tracking-tight: -0.02em;">PROJECT<span style="color: #ffffff;">TRACKER</span></h2>
        <div style="border-top: 1px dashed #1B2A3F; margin: 16px 0;"></div>
        <p style="font-size: 14px; color: #8f98aa;">Hello <strong>${options.userName}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.6;">You have been assigned to the development team on a new project track:</p>
        
        <div style="background-color: #121e30; border: 1px solid #253347; padding: 18px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #ffffff; margin-top: 0; margin-bottom: 8px; font-size: 16px;">${options.projectName}</h3>
          <p style="color: #8f98aa; font-size: 13px; margin: 0 0 12px 0; line-height: 1.5;">${options.description}</p>
          <span style="font-size: 11px; font-weight: bold; background-color: rgba(0, 229, 200, 0.1); color: #00e5c8; padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(0, 229, 200, 0.2);">
            Project Lead: ${options.managerName}
          </span>
        </div>

        <p style="font-size: 14px; line-height: 1.6; color: #8f98aa;">Log in to the dashboard to begin contributing, reviewing Technology Readiness Level (TRL) phases, and mapping Kanban deliverables.</p>
        
        <div style="margin-top: 30px; border-top: 1px dashed #1B2A3F; padding-top: 16px; font-size: 11px; color: #8f98aa; text-align: center;">
          This is an automated system alert. Please do not reply directly to this inbox.
        </div>
      </div>
    `;

    return this.sendMailToUserAndAdmins({ to: options.to, subject, text, html });
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
    const subject = `[Project Tracker] Task Assigned: ${options.taskTitle}`;
    
    const text = `Hello ${options.userName},\n\nYou have been assigned a task on "${options.projectName}":\n\nTask: ${options.taskTitle}\nPriority: ${options.priority}\nDue Date: ${options.dueDate || "Not specified"}\n\nDescription: ${options.description || "No description provided."}\n\nReview details on the project Kanban board.`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #080f1f; color: #ffffff; padding: 24px; border-radius: 12px; max-width: 600px; border: 1px solid #1B2A3F;">
        <h2 style="color: #00e5c8; margin-top: 0; font-weight: 900;">PROJECT<span style="color: #ffffff;">TRACKER</span></h2>
        <div style="border-top: 1px dashed #1B2A3F; margin: 16px 0;"></div>
        <p style="font-size: 14px; color: #8f98aa;">Hello <strong>${options.userName}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.6;">A task has been assigned to your workspace profile on project <strong>${options.projectName}</strong>:</p>
        
        <div style="background-color: #121e30; border: 1px solid #253347; padding: 18px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #ffffff; margin-top: 0; margin-bottom: 8px; font-size: 16px;">🎯 ${options.taskTitle}</h3>
          <p style="color: #8f98aa; font-size: 13px; margin: 0 0 16px 0; line-height: 1.5;">${options.description || "<em>No description provided.</em>"}</p>
          
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <span style="font-size: 10px; font-weight: bold; background-color: #1B2A3F; color: #ffffff; padding: 4px 8px; border-radius: 4px; border: 1px solid #253347; margin-right: 8px;">
              Priority: ${options.priority}
            </span>
            <span style="font-size: 10px; font-weight: bold; background-color: #1B2A3F; color: #ffffff; padding: 4px 8px; border-radius: 4px; border: 1px solid #253347;">
              Due Date: ${options.dueDate || "Flexible"}
            </span>
          </div>
        </div>

        <p style="font-size: 14px; line-height: 1.6; color: #8f98aa;">Please navigate to the project's Kanban board to review requirements, initialize checklists, or log effort hours against this deliverable.</p>
        
        <div style="margin-top: 30px; border-top: 1px dashed #1B2A3F; padding-top: 16px; font-size: 11px; color: #8f98aa; text-align: center;">
          This is an automated system alert. Please do not reply directly to this inbox.
        </div>
      </div>
    `;

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
    const subject = `[Project Tracker] Task Completed: ${options.taskTitle}`;
    
    const text = `Hello ${options.userName},\n\nThe task "${options.taskTitle}" on project "${options.projectName}" has been marked as Completed by ${options.completedBy}.\n\nReview task details on the project Kanban board.`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #080f1f; color: #ffffff; padding: 24px; border-radius: 12px; max-width: 600px; border: 1px solid #1B2A3F;">
        <h2 style="color: #00e5c8; margin-top: 0; font-weight: 900; tracking-tight: -0.02em;">PROJECT<span style="color: #ffffff;">TRACKER</span></h2>
        <div style="border-top: 1px dashed #1B2A3F; margin: 16px 0;"></div>
        <p style="font-size: 14px; color: #8f98aa;">Hello <strong>${options.userName}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.6;">A task has been marked as **Completed** on project <strong>${options.projectName}</strong>:</p>
        
        <div style="background-color: #121e30; border: 1px solid #253347; padding: 18px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #00e5c8; margin-top: 0; margin-bottom: 8px; font-size: 16px;">✅ ${options.taskTitle}</h3>
          <p style="color: #8f98aa; font-size: 13px; margin: 0 0 16px 0; line-height: 1.5;">${options.description || "<em>No description provided.</em>"}</p>
          <span style="font-size: 11px; font-weight: bold; background-color: rgba(0, 229, 200, 0.1); color: #00e5c8; padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(0, 229, 200, 0.2);">
            Completed By: ${options.completedBy}
          </span>
        </div>

        <p style="font-size: 14px; line-height: 1.6; color: #8f98aa;">Thank you for your contribution. You can review all completed deliverables on the project Kanban board.</p>
        
        <div style="margin-top: 30px; border-top: 1px dashed #1B2A3F; padding-top: 16px; font-size: 11px; color: #8f98aa; text-align: center;">
          This is an automated system alert. Please do not reply directly to this inbox.
        </div>
      </div>
    `;

    return this.sendMailToUserAndAdmins({ to: options.to, subject, text, html });
  }

  public async sendAccountApprovalEmail(options: {
    to: string;
    userName: string;
  }) {
    const subject = `[Project Tracker] Account Approved & Activated!`;
    const text = `Hello ${options.userName},\n\nYour registration request has been approved by the system administrator.\n\nYou can now log in to your workspace dashboard to review active projects and tasks.`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #080f1f; color: #ffffff; padding: 24px; border-radius: 12px; max-width: 600px; border: 1px solid #1B2A3F;">
        <h2 style="color: #00e5c8; margin-top: 0; font-weight: 900; tracking-tight: -0.02em;">PROJECT<span style="color: #ffffff;">TRACKER</span></h2>
        <div style="border-top: 1px dashed #1B2A3F; margin: 16px 0;"></div>
        <p style="font-size: 14px; color: #8f98aa;">Hello <strong>${options.userName}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.6;">Your registration request has been approved by the system administrator!</p>
        
        <div style="background-color: #121e30; border: 1px solid #253347; padding: 18px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #00e5c8; margin-top: 0; margin-bottom: 8px; font-size: 15px;">Your Account is Now Active 🎉</h3>
          <p style="color: #8f98aa; font-size: 13px; margin: 0; line-height: 1.5;">You can now access your corporate dashboard, log project effort hours, and begin managing tasks.</p>
        </div>

        <p style="font-size: 14px; line-height: 1.6; color: #8f98aa;">Please head to the login screen using your registered email credentials to access your workspace dashboard.</p>
        
        <div style="margin-top: 30px; border-top: 1px dashed #1B2A3F; padding-top: 16px; font-size: 11px; color: #8f98aa; text-align: center;">
          This is an automated system alert. Please do not reply directly to this inbox.
        </div>
      </div>
    `;

    return this.sendMail({ to: options.to, subject, text, html });
  }

  public async sendRegistrationConfirmationEmail(options: {
    to: string;
    userName: string;
    role: string;
  }) {
    const subject = `[Project Tracker] Registration Received - Pending Approval`;
    const text = `Hello ${options.userName},\n\nYour registration request for the role of ${options.role} has been received. An administrator will review and approve your account shortly.\n\nYou will receive another email once your account is activated.`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #080f1f; color: #ffffff; padding: 24px; border-radius: 12px; max-width: 600px; border: 1px solid #1B2A3F;">
        <h2 style="color: #00e5c8; margin-top: 0; font-weight: 900; tracking-tight: -0.02em;">PROJECT<span style="color: #ffffff;">TRACKER</span></h2>
        <div style="border-top: 1px dashed #1B2A3F; margin: 16px 0;"></div>
        <p style="font-size: 14px; color: #8f98aa;">Hello <strong>${options.userName}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.6;">Thank you for registering with the Project Tracking Platform. Your request has been successfully submitted:</p>
        
        <div style="background-color: #121e30; border: 1px solid #253347; padding: 18px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #00e5c8; margin-top: 0; margin-bottom: 8px; font-size: 15px;">Registration Pending Approval ⏳</h3>
          <p style="color: #8f98aa; font-size: 13px; margin: 0; line-height: 1.5;">
            Your account is currently pending administrator activation for the role of <strong>${options.role === "ADMIN" ? "ADMINISTRATOR" : options.role === "MANAGER" ? "PROJECT MANAGER" : "RESEARCH ENGINEER"}</strong>.
            You will receive a notification email as soon as your profile is activated.
          </p>
        </div>

        <p style="font-size: 14px; line-height: 1.6; color: #8f98aa;">If you have any questions, please contact your project administrator.</p>
        
        <div style="margin-top: 30px; border-top: 1px dashed #1B2A3F; padding-top: 16px; font-size: 11px; color: #8f98aa; text-align: center;">
          This is an automated system alert. Please do not reply directly to this inbox.
        </div>
      </div>
    `;
    return this.sendMail({ to: options.to, subject, text, html });
  }

  private async getAdminEmails(): Promise<string[]> {
    try {
      const admins = await prisma.user.findMany({
        where: { role: "ADMIN", isActive: true, isPending: false }
      });
      return admins.map(a => a.email).filter(Boolean);
    } catch (err) {
      console.error("EmailService: Failed to fetch admin emails:", err);
      return ["miltomy01@gmail.com"];
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

    console.log(`EmailService: Dispatching email to ${recipients.length} recipients: ${recipients.join(", ")}`);

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
