import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../services/prisma.js";
import { createNotification } from "../services/notificationService.js";
import { emailService } from "../services/emailService.js";
import { logActivity } from "../services/activityService.js";
import { getJwtSecret } from "../utils/env.js";

export async function register(request: Request, response: Response) {
  const { name, email, password, role } = request.body;

  try {
    if (!name || !email || !password || !role) {
      response.status(400).json({ message: "All fields are required." });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if email already registered
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail }
    });

    if (existingUser) {
      response.status(400).json({ message: "Email address is already registered." });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Find Role table record id to link
    const targetRole = await prisma.role.findUnique({
      where: { name: role }
    });

    // Create user as pending (not active, pending approval)
    const newUser = await prisma.user.create({
      data: {
        name,
        email: cleanEmail,
        passwordHash,
        role: role,
        roleId: targetRole?.id || null,
        isActive: false,
        isPending: true,
        weeklyTargetHours: 40
      }
    });

    // Log user registration request
    await logActivity(
      newUser.id,
      "REGISTERED_USER",
      null,
      null,
      `Submitted registration request for account "${newUser.email}"`
    );

    // Notify all active admin users of the new registration request
    try {
      const admins = await prisma.user.findMany({
        where: { role: "ADMIN", isActive: true, isPending: false }
      });

      for (const admin of admins) {
        // Create database notification
        await createNotification({
          recipientId: admin.id,
          title: "Pending Registration Request",
          message: `New registration request from ${newUser.name} (${newUser.email}) for the role of ${newUser.role}.`,
          type: "PENDING_REGISTRATION",
          link: "/admin"
        });
      }
    } catch (notifErr) {
      console.error("Failed to trigger registration request notifications:", notifErr);
    }

    // Send email confirmation to the new user
    try {
      await emailService.sendRegistrationConfirmationEmail({
        to: newUser.email,
        userName: newUser.name,
        role: newUser.role
      });
    } catch (mailErr) {
      console.error("Failed to send registration confirmation email to user:", mailErr);
    }

    response.status(201).json({
      message: "Registration request submitted. An administrator must approve your account.",
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        isPending: newUser.isPending,
        isActive: newUser.isActive
      }
    });
  } catch (error) {
    console.error("API registration error:", error);
    response.status(500).json({ message: "Internal server error." });
  }
}

export async function login(request: Request, response: Response) {
  const { email, password } = request.body;

  try {
    if (!email || !password) {
      response.status(400).json({ message: "Email and password are required." });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail }
    });

    if (!user) {
      response.status(400).json({ message: "Invalid email address or password." });
      return;
    }

    // Compare Bcrypt hashes
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      response.status(400).json({ message: "Invalid email address or password." });
      return;
    }

    // Verify account state constraints
    if (user.isPending) {
      response.status(403).json({ message: "Your registration request is pending administrator approval." });
      return;
    }

    if (!user.isActive) {
      response.status(403).json({ message: "This account is deactivated. Please contact your administrator." });
      return;
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      getJwtSecret(),
      { expiresIn: "7d" }
    );

    response.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        isPending: user.isPending,
        weeklyTargetHours: user.weeklyTargetHours,
        notificationEmail: user.notificationEmail,
        phoneNumber: user.phoneNumber,
        location: user.location,
        bio: user.bio,
        skills: user.skills,
        avatarUrl: user.avatarUrl
      }
    });
  } catch (error) {
    console.error("API login error:", error);
    response.status(500).json({ message: "Internal server error." });
  }
}

export function logout(_request: Request, response: Response) {
  response.status(200).json({ message: "Logged out successfully." });
}

export async function me(request: Request, response: Response) {
  if (!request.user) {
    response.status(401).json({ message: "Authentication required." });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: request.user.userId }
    });

    if (!user) {
      response.status(404).json({ message: "User session not found." });
      return;
    }

    response.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        isPending: user.isPending,
        weeklyTargetHours: user.weeklyTargetHours,
        notificationEmail: user.notificationEmail,
        phoneNumber: user.phoneNumber,
        location: user.location,
        bio: user.bio,
        skills: user.skills,
        avatarUrl: user.avatarUrl
      }
    });
  } catch (error) {
    console.error("API me error:", error);
    response.status(500).json({ message: "Internal server error." });
  }
}
