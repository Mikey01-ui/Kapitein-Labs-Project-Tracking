import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function run() {
  const pmEmail = "pm@miltomy.com";
  const pmPassword = "Password123!";
  const pmName = "Sarah Jenkins (Project Manager)";

  const passwordHash = await bcrypt.hash(pmPassword, 10);

  const pmUser = await prisma.user.upsert({
    where: { email: pmEmail },
    update: {
      name: pmName,
      passwordHash,
      role: "PROJECT_MANAGER",
      isActive: true,
      isPending: false,
    },
    create: {
      name: pmName,
      email: pmEmail,
      passwordHash,
      role: "PROJECT_MANAGER",
      isActive: true,
      isPending: false,
    },
  });

  console.log(`Project Manager Account: ${pmUser.email} (ID: ${pmUser.id})`);

  const owner = await prisma.user.findFirst({
    where: { role: "OWNER" },
  });

  const ownerId = owner?.id || pmUser.id;

  let sampleProject = await prisma.project.findFirst({
    where: { managerId: pmUser.id },
  });

  if (!sampleProject) {
    sampleProject = await prisma.project.create({
      data: {
        name: "Enterprise AI Automation Platform",
        clientName: "Luminary Studios",
        description: "End-to-end automation workflow and client intelligence dashboard.",
        startDate: new Date(),
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: "ACTIVE",
        createdById: ownerId,
        managerId: pmUser.id,
      },
    });

    // Create default Kanban Columns
    const colBacklog = await prisma.kanbanColumn.create({
      data: {
        projectId: sampleProject.id,
        title: "Backlog",
        order: 0,
      },
    });

    const colInProgress = await prisma.kanbanColumn.create({
      data: {
        projectId: sampleProject.id,
        title: "In Progress",
        order: 1,
      },
    });

    const colReview = await prisma.kanbanColumn.create({
      data: {
        projectId: sampleProject.id,
        title: "Review",
        order: 2,
      },
    });

    const colCompleted = await prisma.kanbanColumn.create({
      data: {
        projectId: sampleProject.id,
        title: "Completed",
        order: 3,
      },
    });

    // Create Sample Cards
    await prisma.kanbanCard.create({
      data: {
        projectId: sampleProject.id,
        columnId: colBacklog.id,
        title: "Architecture & VPC Routing",
        description: "Provision AWS cloud containers and secure reverse proxy.",
        priority: "HIGH",
        order: 0,
      },
    });

    await prisma.kanbanCard.create({
      data: {
        projectId: sampleProject.id,
        columnId: colInProgress.id,
        title: "Client Portal Design & Kanban Board",
        description: "Implement dark theme styling with dual priority indicators.",
        priority: "HIGH",
        order: 0,
      },
    });

    await prisma.kanbanCard.create({
      data: {
        projectId: sampleProject.id,
        columnId: colReview.id,
        title: "Security & Role Access Review",
        description: "Audit RBAC permissions across PM and Owner accounts.",
        priority: "MEDIUM",
        order: 0,
      },
    });

    await prisma.kanbanCard.create({
      data: {
        projectId: sampleProject.id,
        columnId: colCompleted.id,
        title: "Project Initiation & Kickoff",
        description: "Initial scoping meeting with Luminary Studios executive team.",
        priority: "LOW",
        order: 0,
      },
    });

    console.log(`Created sample project: "${sampleProject.name}" with full Kanban Board!`);
  } else {
    console.log(`Existing project already assigned to PM: "${sampleProject.name}"`);
  }

  console.log("\n==========================================");
  console.log("PROJECT MANAGER LOGIN CREDENTIALS:");
  console.log(`Email:    ${pmEmail}`);
  console.log(`Password: ${pmPassword}`);
  console.log(`Role:     PROJECT_MANAGER`);
  console.log("==========================================\n");
}

run()
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
