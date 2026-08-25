import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
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
  await prisma.hourLog.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.tRLSignoff.deleteMany();
  await prisma.tRLReview.deleteMany();
  await prisma.tRLHistory.deleteMany();
  await prisma.tRLCriteria.deleteMany();
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
    console.log("Set SEED_RESET=true to wipe the database and recreate the admin account.");
    return;
  }

  if (reset) {
    console.log("SEED_RESET=true — wiping existing data");
    await wipeDatabase();
  }

  const adminName = process.env.ADMIN_NAME || "Administrator";
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@example.com").toLowerCase().trim();
  const adminPassword = process.env.ADMIN_PASSWORD || "change-me";

  if (adminPassword === "change-me") {
    console.warn("WARNING: Using the default admin password. Change ADMIN_PASSWORD before going live.");
  }

  const adminRole = await prisma.role.upsert({
    where: { name: "ADMIN" },
    update: {},
    create: { id: "role-admin", name: "ADMIN" },
  });

  const managerRole = await prisma.role.upsert({
    where: { name: "MANAGER" },
    update: {},
    create: { id: "role-manager", name: "MANAGER" },
  });

  const employeeRole = await prisma.role.upsert({
    where: { name: "EMPLOYEE" },
    update: {},
    create: { id: "role-employee", name: "EMPLOYEE" },
  });

  const permissions = [
    { name: "CREATE_PROJECT", id: "perm-create-project" },
    { name: "APPROVE_USER", id: "perm-approve-user" },
    { name: "MANAGE_TEAM", id: "perm-manage-team" },
    { name: "LOG_HOURS", id: "perm-log-hours" },
    { name: "REQUEST_TRL_REVIEW", id: "perm-request-trl-review" },
    { name: "SIGNOFF_TRL", id: "perm-signoff-trl" },
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
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: perm.id },
    });
  }

  for (const permId of ["perm-log-hours", "perm-request-trl-review", "perm-signoff-trl"]) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: managerRole.id, permissionId: permId } },
      update: {},
      create: { roleId: managerRole.id, permissionId: permId },
    });
  }

  await prisma.rolePermission.upsert({
    where: { roleId_permissionId: { roleId: employeeRole.id, permissionId: "perm-log-hours" } },
    update: {},
    create: { roleId: employeeRole.id, permissionId: "perm-log-hours" },
  });

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName,
      passwordHash,
      role: "ADMIN",
      roleId: adminRole.id,
      isActive: true,
      isPending: false,
    },
    create: {
      name: adminName,
      email: adminEmail,
      passwordHash,
      role: "ADMIN",
      roleId: adminRole.id,
      isActive: true,
      isPending: false,
      weeklyTargetHours: 40,
    },
  });

  console.log(`Admin account ready: ${adminEmail}`);
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
