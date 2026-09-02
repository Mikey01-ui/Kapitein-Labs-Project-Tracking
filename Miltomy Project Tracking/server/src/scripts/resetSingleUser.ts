import { prisma } from "../services/prisma.js";
import bcrypt from "bcrypt";

async function resetUsers() {
  console.log("Cleaning and resetting users table...");
  const passwordHash = await bcrypt.hash("Saikik1234", 10);

  // 1. Delete relations
  await prisma.notification.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.checklistItem.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.kanbanCard.deleteMany();
  await prisma.kanbanColumn.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.project.deleteMany();

  // 2. Delete all existing users
  await prisma.user.deleteMany();
  console.log("All existing users removed.");

  // 3. Create the single Owner account
  const owner = await prisma.user.create({
    data: {
      name: "Milton",
      email: "miltomy@gmail.com",
      passwordHash,
      role: "OWNER",
      isActive: true,
      isPending: false,
      notificationEmail: "miltomy@gmail.com",
      bio: "Agency Founder & Lead Engineer"
    }
  });

  console.log("Created sole Owner account:");
  console.log({
    id: owner.id,
    name: owner.name,
    email: owner.email,
    role: owner.role,
    isActive: owner.isActive
  });

  // 4. Create sample starter project for the owner
  const project = await prisma.project.create({
    data: {
      name: "Miltomy Agency Platform",
      clientName: "Miltomy Internal",
      description: "Full-stack project intelligence, client deliverables, and AI orchestration engine.",
      startDate: new Date(),
      status: "ACTIVE",
      createdById: owner.id,
      managerId: owner.id
    }
  });

  // 5. Create default Kanban columns
  const todoCol = await prisma.kanbanColumn.create({
    data: {
      title: "To Do",
      order: 0,
      projectId: project.id
    }
  });

  const inProgressCol = await prisma.kanbanColumn.create({
    data: {
      title: "In Progress",
      order: 1,
      projectId: project.id
    }
  });

  const doneCol = await prisma.kanbanColumn.create({
    data: {
      title: "Done",
      order: 2,
      projectId: project.id
    }
  });

  // 6. Create sample card
  await prisma.kanbanCard.create({
    data: {
      title: "Client Portal & Custom Domain Email Integration",
      description: "Cloudflare tunnel setup and Resend transactional dispatch verified.",
      priority: "HIGH",
      order: 0,
      columnId: doneCol.id,
      projectId: project.id,
      assignees: {
        connect: [{ id: owner.id }]
      }
    }
  });

  console.log("Setup complete! Single user database initialized.");
  await prisma.$disconnect();
}

resetUsers().catch((e) => {
  console.error("Failed to reset users:", e);
  process.exit(1);
});
