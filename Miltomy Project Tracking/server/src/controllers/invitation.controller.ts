import { Request, Response } from "express";
import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../services/prisma.js";
import { getEnv, getJwtSecret } from "../utils/env.js";
import { sendEmail } from "../services/emailService.js";

export async function createInvitation(req: Request, res: Response) {
  const user = req.user;
  if (!user || !user.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { email, role = "PROJECT_MANAGER", projectId } = req.body;

  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "A valid email address is required" });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser && existingUser.isActive) {
    return res.status(400).json({ error: "A user with this email address already exists" });
  }

  // If PM is inviting, ensure they can only invite TEAM_MEMBER to their own project
  if (user.role === "PROJECT_MANAGER") {
    if (role === "OWNER" || role === "PROJECT_MANAGER") {
      return res.status(403).json({ error: "Project Managers can only invite Team Members" });
    }
    if (!projectId) {
      return res.status(400).json({ error: "Project ID is required when inviting a team member" });
    }

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [{ managerId: user.userId }, { members: { some: { userId: user.userId } } }],
      },
    });

    if (!project) {
      return res.status(403).json({ error: "You do not have permission to invite members to this project" });
    }
  }

  // Invalidate any existing pending invitations for this email + project
  await prisma.invitation.updateMany({
    where: {
      email: normalizedEmail,
      status: "PENDING",
      ...(projectId ? { projectId } : {}),
    },
    data: { status: "CANCELLED" },
  });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invitation = await prisma.invitation.create({
    data: {
      email: normalizedEmail,
      role: role as any,
      projectId: projectId || null,
      token,
      expiresAt,
      status: "PENDING",
      invitedById: user.userId,
    },
    include: {
      project: { select: { id: true, name: true, clientName: true } },
      invitedBy: { select: { id: true, name: true, email: true } },
    },
  });

  const clientOrigin = (getEnv("CLIENT_ORIGIN", "https://project-tracker.miltomy.com")).split(",")[0].trim();
  const inviteUrl = `${clientOrigin}/invite/${token}`;

  // Log activity
  await prisma.activityLog.create({
    data: {
      userId: user.userId,
      projectId: projectId || null,
      actionType: "USER_INVITED",
      details: `Invited ${normalizedEmail} as ${role}${invitation.project ? ` to ${invitation.project.name}` : ""}`,
    },
  });

  // Attempt sending email (fails gracefully if SMTP not configured)
  try {
    const roleTitle = role === "PROJECT_MANAGER" ? "Project Manager" : "Team Member";
    const emailSubject = `[Miltomy] Invitation to join workspace as ${roleTitle}`;
    const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation to join Miltomy</title>
</head>
<body style="margin: 0; padding: 0; background-color: #080808; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #080808; padding: 40px 16px;">
    <tr>
      <td align="center">
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
              <h2 style="font-size: 20px; font-weight: 800; color: #ffffff; margin: 0 0 12px 0; letter-spacing: -0.2px;">
                You're Invited to Join Miltomy
              </h2>
              
              <p style="font-size: 14px; line-height: 1.6; color: #888888; margin: 0 0 24px 0;">
                <strong style="color: #ffffff;">${user.name || user.email}</strong> has invited you to join the agency workspace on <strong style="color: #ffffff;">Miltomy</strong>.
              </p>

              <!-- Inner Highlight Box -->
              <div style="background-color: #161616; border: 1px solid #262626; border-radius: 4px; padding: 22px; margin-bottom: 28px;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding-bottom: 12px;">
                      <span style="font-size: 10px; font-weight: 800; color: #888888; text-transform: uppercase; letter-spacing: 0.15em; display: block; margin-bottom: 2px;">Assigned System Role</span>
                      <span style="font-size: 14px; font-weight: 700; color: #c8ff00;">${roleTitle}</span>
                    </td>
                  </tr>
                  ${invitation.project ? `
                  <tr>
                    <td style="border-top: 1px solid #222222; padding-top: 12px;">
                      <span style="font-size: 10px; font-weight: 800; color: #888888; text-transform: uppercase; letter-spacing: 0.15em; display: block; margin-bottom: 2px;">Allocated Project Track</span>
                      <span style="font-size: 14px; font-weight: 700; color: #ffffff;">${invitation.project.name} <span style="color: #888888; font-size: 12px; font-weight: normal;">(${invitation.project.clientName})</span></span>
                    </td>
                  </tr>
                  ` : ""}
                </table>
              </div>

              <!-- Call to Action Button -->
              <div style="text-align: center; margin: 32px 0 16px 0;">
                <a href="${inviteUrl}" style="display: inline-block; background-color: #c8ff00; color: #080808; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.18em; text-decoration: none; padding: 16px 32px; border-radius: 4px; box-shadow: 0 8px 20px rgba(200, 255, 0, 0.15);">
                  Accept Invitation & Activate Account &rarr;
                </a>
              </div>

              <p style="font-size: 12px; line-height: 1.6; color: #666666; margin-top: 24px; text-align: center;">
                Or copy and paste this link in your browser:<br>
                <span style="color: #888888; word-break: break-all; font-size: 11px;">${inviteUrl}</span>
              </p>
              
              <p style="font-size: 11px; color: #444444; text-align: center; margin-top: 16px;">
                This invitation link is unique to you and will expire in 7 days.
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
    await sendEmail({
      to: normalizedEmail,
      subject: emailSubject,
      html: emailBody,
    });
  } catch (err) {
    console.warn("Could not dispatch invitation email:", err);
  }

  return res.status(201).json({
    message: "Invitation created successfully",
    invitation,
    inviteUrl,
  });
}

export async function getInvitationByToken(req: Request, res: Response) {
  const { token } = req.params;

  if (!token) {
    return res.status(400).json({ error: "Token is required" });
  }

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: {
      project: { select: { id: true, name: true, clientName: true, description: true } },
      invitedBy: { select: { id: true, name: true, email: true } },
    },
  });

  if (!invitation) {
    return res.status(404).json({ error: "Invitation not found or has been revoked" });
  }

  if (invitation.status !== "PENDING") {
    return res.status(400).json({ error: `This invitation is already ${invitation.status.toLowerCase()}` });
  }

  if (new Date() > invitation.expiresAt) {
    return res.status(400).json({ error: "This invitation link has expired" });
  }

  return res.json({
    email: invitation.email,
    role: invitation.role,
    project: invitation.project,
    invitedBy: invitation.invitedBy,
    expiresAt: invitation.expiresAt,
  });
}

export async function acceptInvitation(req: Request, res: Response) {
  const { token, name, password } = req.body;

  if (!token || !name || !password) {
    return res.status(400).json({ error: "Token, name, and password are required" });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters long" });
  }

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { project: true },
  });

  if (!invitation || invitation.status !== "PENDING" || new Date() > invitation.expiresAt) {
    return res.status(400).json({ error: "Invalid or expired invitation token" });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  // Upsert user
  const user = await prisma.user.upsert({
    where: { email: invitation.email },
    update: {
      name,
      passwordHash,
      role: invitation.role,
      isActive: true,
      isPending: false,
    },
    create: {
      name,
      email: invitation.email,
      passwordHash,
      role: invitation.role,
      isActive: true,
      isPending: false,
    },
  });

  // Link to project if specified
  if (invitation.projectId) {
    await prisma.projectMember.upsert({
      where: {
        projectId_userId: {
          projectId: invitation.projectId,
          userId: user.id,
        },
      },
      update: {},
      create: {
        projectId: invitation.projectId,
        userId: user.id,
      },
    });

    // If role is PROJECT_MANAGER and project creator is owner, make them manager
    if (invitation.role === "PROJECT_MANAGER") {
      await prisma.project.update({
        where: { id: invitation.projectId },
        data: { managerId: user.id },
      });
    }
  }

  // Mark invitation accepted
  await prisma.invitation.update({
    where: { id: invitation.id },
    data: { status: "ACCEPTED" },
  });

  // Log activity
  await prisma.activityLog.create({
    data: {
      userId: user.id,
      projectId: invitation.projectId,
      actionType: "USER_JOINED",
      details: `${user.name} joined as ${invitation.role}${invitation.project ? ` (${invitation.project.name})` : ""}`,
    },
  });

  const jwtSecret = getJwtSecret();
  const authToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    jwtSecret,
    { expiresIn: "7d" }
  );

  return res.json({
    message: "Account created and invitation accepted successfully",
    token: authToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
}

export async function listInvitations(req: Request, res: Response) {
  const user = req.user;
  if (!user || !user.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  let whereClause: any = {};
  if (user.role === "PROJECT_MANAGER") {
    whereClause = {
      invitedById: user.userId,
    };
  }

  const invitations = await prisma.invitation.findMany({
    where: whereClause,
    include: {
      project: { select: { id: true, name: true, clientName: true } },
      invitedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return res.json({ invitations });
}

export async function cancelInvitation(req: Request, res: Response) {
  const { id } = req.params;
  const user = req.user;
  if (!user || !user.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const invitation = await prisma.invitation.findUnique({
    where: { id },
  });

  if (!invitation) {
    return res.status(404).json({ error: "Invitation not found" });
  }

  if (user.role !== "OWNER" && invitation.invitedById !== user.userId) {
    return res.status(403).json({ error: "You do not have permission to cancel this invitation" });
  }

  await prisma.invitation.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  return res.json({ message: "Invitation cancelled successfully" });
}
