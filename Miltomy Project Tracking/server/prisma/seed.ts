import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import "dotenv/config";

const prisma = new PrismaClient();

async function wipeDatabase() {
  await prisma.activityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.checklistItem.deleteMany();
  await prisma.kanbanCard.deleteMany();
  await prisma.kanbanColumn.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
}

async function main() {
  const reset = process.env.SEED_RESET === "true";
  const existingUsers = await prisma.user.count();

  if (existingUsers > 0 && !reset) {
    console.log("Database already has users. Skipping seed.");
    console.log("Set SEED_RESET=true to wipe the database and recreate the owner account.");
    return;
  }

  if (reset) {
    console.log("SEED_RESET=true — wiping existing data");
    await wipeDatabase();
  }

  const ownerName = process.env.OWNER_NAME || process.env.ADMIN_NAME || "Miltomy Agency Owner";
  const ownerEmail = (process.env.OWNER_EMAIL || process.env.ADMIN_EMAIL || "owner@miltomy.com").toLowerCase().trim();
  const ownerPassword = process.env.OWNER_PASSWORD || process.env.ADMIN_PASSWORD || "miltomy123";

  const ownerRole = await prisma.role.upsert({
    where: { name: "OWNER" },
    update: {},
    create: { id: "role-owner", name: "OWNER" },
  });

  const pmRole = await prisma.role.upsert({
    where: { name: "PROJECT_MANAGER" },
    update: {},
    create: { id: "role-pm", name: "PROJECT_MANAGER" },
  });

  const memberRole = await prisma.role.upsert({
    where: { name: "TEAM_MEMBER" },
    update: {},
    create: { id: "role-member", name: "TEAM_MEMBER" },
  });

  const permissions = [
    { name: "CREATE_PROJECT", id: "perm-create-project" },
    { name: "INVITE_USERS", id: "perm-invite-users" },
    { name: "MANAGE_TEAM", id: "perm-manage-team" },
    { name: "MANAGE_TASKS", id: "perm-manage-tasks" },
    { name: "VIEW_REPORTS", id: "perm-view-reports" },
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: perm,
    });
  }

  for (const perm of permissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: ownerRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: ownerRole.id, permissionId: perm.id },
    });
  }

  for (const permId of ["perm-manage-tasks", "perm-invite-users"]) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: pmRole.id, permissionId: permId } },
      update: {},
      create: { roleId: pmRole.id, permissionId: permId },
    });
  }

  await prisma.rolePermission.upsert({
    where: { roleId_permissionId: { roleId: memberRole.id, permissionId: "perm-manage-tasks" } },
    update: {},
    create: { roleId: memberRole.id, permissionId: "perm-manage-tasks" },
  });

  const passwordHash = await bcrypt.hash(ownerPassword, 10);

  await prisma.user.upsert({
    where: { email: ownerEmail },
    update: {
      name: ownerName,
      passwordHash,
      role: "OWNER",
      roleId: ownerRole.id,
      isActive: true,
      isPending: false,
    },
    create: {
      name: ownerName,
      email: ownerEmail,
      passwordHash,
      role: "OWNER",
      roleId: ownerRole.id,
      isActive: true,
      isPending: false,
    },
  });

  console.log(`Miltomy Agency Owner ready: ${ownerEmail}`);
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
