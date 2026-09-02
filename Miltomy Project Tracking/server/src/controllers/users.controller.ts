import type { Request, Response } from "express";
import { prisma } from "../services/prisma.js";
import { createNotification } from "../services/notificationService.js";
import { logActivity } from "../services/activityService.js";
import bcrypt from "bcrypt";

export async function listUsers(request: Request, response: Response) {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "asc" }
    });

    const formatted = users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      isPending: u.isPending,
      notificationEmail: u.notificationEmail,
      phoneNumber: u.phoneNumber,
      location: u.location,
      bio: u.bio,
      skills: u.skills,
      avatarUrl: u.avatarUrl,
      createdAt: u.createdAt.toISOString().split("T")[0]
    }));

    response.status(200).json({ users: formatted });
  } catch (error) {
    console.error("Failed to list users:", error);
    response.status(500).json({ message: "Failed to list users." });
  }
}

export async function updateUser(request: Request, response: Response) {
  const { id } = request.params;
  const { role, isActive, isPending, name, email, notificationEmail, phoneNumber, location, bio, skills, avatarUrl } = request.body;

  try {
    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      response.status(404).json({ message: "User not found." });
      return;
    }

    let roleId = undefined;
    if (role) {
      const targetRole = await prisma.role.findUnique({
        where: { name: role }
      });
      if (targetRole) {
        roleId = targetRole.id;
      }
    }

    const wasPending = user.isPending;
    const isNowApproved = isPending === false && wasPending === true;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        role: role !== undefined ? role : undefined,
        roleId: roleId !== undefined ? roleId : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
        isPending: isPending !== undefined ? isPending : undefined,
        name: name !== undefined ? name : undefined,
        email: email !== undefined ? email : undefined,
        notificationEmail: notificationEmail !== undefined ? notificationEmail : undefined,
        phoneNumber: phoneNumber !== undefined ? phoneNumber : undefined,
        location: location !== undefined ? location : undefined,
        bio: bio !== undefined ? bio : undefined,
        skills: skills !== undefined ? skills : undefined,
        avatarUrl: avatarUrl !== undefined ? avatarUrl : undefined
      }
    });

    if (isNowApproved) {
      await createNotification({
        recipientId: updatedUser.id,
        title: "Account Activated",
        message: "Your Miltomy Agency Portal profile has been approved and activated! Welcome aboard.",
        type: "ACCOUNT_ACTIVATION",
        link: "/profile"
      });

      logActivity(
        request.user?.userId || request.user?.id || "system",
        "APPROVED_USER",
        null,
        null,
        `Approved user "${updatedUser.name}" as ${updatedUser.role}`
      );
    } else {
      if (role && role !== user.role) {
        logActivity(
          request.user?.userId || request.user?.id || "system",
          "UPDATED_USER_ROLE",
          null,
          null,
          `Updated role for "${updatedUser.name}" from ${user.role} to ${updatedUser.role}`
        );
      }
      if (isActive !== undefined && isActive !== user.isActive) {
        logActivity(
          request.user?.userId || request.user?.id || "system",
          isActive ? "ACTIVATED_USER" : "DEACTIVATED_USER",
          null,
          null,
          `${isActive ? "Reactivated" : "Deactivated"} account for "${updatedUser.name}"`
        );
      }
    }

    response.status(200).json({
      message: "User updated successfully.",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
        isPending: updatedUser.isPending,
        notificationEmail: updatedUser.notificationEmail,
        phoneNumber: updatedUser.phoneNumber,
        location: updatedUser.location,
        bio: updatedUser.bio,
        skills: updatedUser.skills,
        avatarUrl: updatedUser.avatarUrl,
        createdAt: updatedUser.createdAt.toISOString().split("T")[0]
      }
    });
  } catch (error) {
    console.error("Failed to update user:", error);
    response.status(500).json({ message: "Failed to update user." });
  }
}

export async function deleteUser(request: Request, response: Response) {
  const { id } = request.params;

  try {
    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      response.status(404).json({ message: "User not found." });
      return;
    }

    await prisma.user.delete({
      where: { id }
    });

    logActivity(
      request.user?.userId || request.user?.id || "system",
      "DELETED_USER",
      null,
      null,
      `Deleted user account "${user.name}" (${user.email})`
    );

    response.status(200).json({ message: "User deleted successfully." });
  } catch (error) {
    console.error("Failed to delete user:", error);
    response.status(500).json({ message: "Failed to delete user." });
  }
}

export async function changePassword(request: Request, response: Response) {
  const { id } = request.params;
  const { currentPassword, newPassword } = request.body;
  const currentUserId = request.user?.userId || request.user?.id;
  const userRole = request.user?.role;

  try {
    if (!request.user || (currentUserId !== id && userRole !== "OWNER")) {
      response.status(403).json({ message: "Forbidden. You cannot change another user's password." });
      return;
    }

    if (!currentPassword || !newPassword) {
      response.status(400).json({ message: "Current password and new password are required." });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      response.status(404).json({ message: "User not found." });
      return;
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      response.status(400).json({ message: "Invalid current password." });
      return;
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id },
      data: { passwordHash: newPasswordHash }
    });

    response.status(200).json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("Failed to change password:", error);
    response.status(500).json({ message: "Failed to change password." });
  }
}
