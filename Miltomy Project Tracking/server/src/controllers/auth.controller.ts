import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../services/prisma.js";
import { createNotification } from "../services/notificationService.js";
import { logActivity } from "../services/activityService.js";
import { getJwtSecret } from "../utils/env.js";

export async function register(request: Request, response: Response) {
  const { name, email, password, role = "PROJECT_MANAGER" } = request.body;

  try {
    if (!name || !email || !password) {
      response.status(400).json({ message: "Name, email, and password are required." });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail }
    });

    if (existingUser) {
      response.status(400).json({ message: "Email address is already registered." });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email: cleanEmail,
        passwordHash,
        role: role as any,
        isActive: true,
        isPending: false,
      }
    });

    await logActivity(
      newUser.id,
      "REGISTERED_USER",
      null,
      null,
      `Created account "${newUser.email}" as ${newUser.role}`
    );

    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email, role: newUser.role },
      getJwtSecret(),
      { expiresIn: "7d" }
    );

    response.status(201).json({
      message: "Registration successful.",
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        isActive: newUser.isActive,
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

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      response.status(400).json({ message: "Invalid email address or password." });
      return;
    }

    if (!user.isActive) {
      response.status(403).json({ message: "This account has been deactivated. Please contact your agency owner." });
      return;
    }

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
  const userId = request.user?.userId || request.user?.id;
  if (!userId) {
    response.status(401).json({ message: "Authentication required." });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
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
