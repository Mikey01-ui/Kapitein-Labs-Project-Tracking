import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting clean database initialization...");

  // 1. Delete all existing transaction and domain data to clean the system
  console.log("Wiping existing database tables...");
  await prisma.activityLog.deleteMany({});
  await prisma.attachment.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.kanbanCard.deleteMany({});
  await prisma.kanbanColumn.deleteMany({});
  await prisma.milestone.deleteMany({});
  await prisma.hourLog.deleteMany({});
  await prisma.tRLSignoff.deleteMany({});
  await prisma.tRLReview.deleteMany({});
  await prisma.tRLHistory.deleteMany({});
  await prisma.projectMember.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.rolePermission.deleteMany({});
  await prisma.permission.deleteMany({});
  await prisma.role.deleteMany({});
  console.log("Database tables successfully cleared.");

  // 2. Re-create Default Roles
  console.log("Seeding system roles...");
  const adminRole = await prisma.role.create({
    data: {
      id: "role-admin",
      name: "ADMIN",
    },
  });

  const managerRole = await prisma.role.create({
    data: {
      id: "role-manager",
      name: "MANAGER",
    },
  });

  const employeeRole = await prisma.role.create({
    data: {
      id: "role-employee",
      name: "EMPLOYEE",
    },
  });
  console.log("Roles created.");

  // 3. Re-create Default Permissions
  console.log("Seeding permissions...");
  const permissions = [
    { name: "CREATE_PROJECT", id: "perm-create-project" },
    { name: "APPROVE_USER", id: "perm-approve-user" },
    { name: "MANAGE_TEAM", id: "perm-manage-team" },
    { name: "LOG_HOURS", id: "perm-log-hours" },
    { name: "REQUEST_TRL_REVIEW", id: "perm-request-trl-review" },
    { name: "SIGNOFF_TRL", id: "perm-signoff-trl" },
  ];

  for (const perm of permissions) {
    await prisma.permission.create({
      data: perm,
    });
  }
  console.log("Permissions created.");

  // 4. Map Permissions to Roles
  console.log("Mapping role permissions...");
  // ADMIN gets everything
  for (const perm of permissions) {
    await prisma.rolePermission.create({
      data: {
        roleId: adminRole.id,
        permissionId: perm.id,
      },
    });
  }

  // MANAGER gets LOG_HOURS, REQUEST_TRL_REVIEW, SIGNOFF_TRL
  const managerPerms = ["perm-log-hours", "perm-request-trl-review", "perm-signoff-trl"];
  for (const permId of managerPerms) {
    await prisma.rolePermission.create({
      data: {
        roleId: managerRole.id,
        permissionId: permId,
      },
    });
  }

  // EMPLOYEE gets LOG_HOURS
  await prisma.rolePermission.create({
    data: {
      roleId: employeeRole.id,
      permissionId: "perm-log-hours",
    },
  });
  console.log("Role permission mappings completed.");

  // 5. Create the requested Admin Account
  const adminEmail = "p.hein@kapiteinlabs.com";
  const rawPassword = "Pepernoot01";
  console.log(`Hashing password for admin user ${adminEmail}...`);
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  const adminUser = await prisma.user.create({
    data: {
      name: "Pieter Hein",
      email: adminEmail,
      passwordHash,
      role: "ADMIN",
      roleId: adminRole.id,
      isActive: true,
      isPending: false,
      weeklyTargetHours: 40,
    },
  });

  console.log(`Clean Administrator account successfully created: ${adminUser.email}`);

  // Create additional requested admin account
  const admin2Email = "donruinard@gmail.com";
  const admin2Password = "donnyr@01";
  console.log(`Hashing password for admin user ${admin2Email}...`);
  const admin2Hash = await bcrypt.hash(admin2Password, 10);
  const admin2User = await prisma.user.create({
    data: {
      name: "Don Ruinard",
      email: admin2Email,
      passwordHash: admin2Hash,
      role: "ADMIN",
      roleId: adminRole.id,
      isActive: true,
      isPending: false,
      weeklyTargetHours: 40,
    },
  });
  console.log(`Additional Administrator account successfully created: ${admin2User.email}`);

  // Create requested employee account
  const employeeEmail = "miltomy01@gmail.com";
  const employeePassword = "Saikik1234";
  console.log(`Hashing password for employee user ${employeeEmail}...`);
  const employeeHash = await bcrypt.hash(employeePassword, 10);
  const employeeUser = await prisma.user.create({
    data: {
      name: "Milton Employee",
      email: employeeEmail,
      passwordHash: employeeHash,
      role: "EMPLOYEE",
      roleId: employeeRole.id,
      isActive: true,
      isPending: false,
      weeklyTargetHours: 40,
    },
  });
  console.log(`Requested Employee account successfully created: ${employeeUser.email}`);

  console.log("Clean database initialization completed successfully.");
}

main()
  .catch((e) => {
    console.error("Clean seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
