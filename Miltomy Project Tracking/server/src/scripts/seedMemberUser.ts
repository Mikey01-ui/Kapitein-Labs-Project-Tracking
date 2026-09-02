import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function run() {
  const memberEmail = "member@miltomy.com";
  const memberPassword = "Password123!";
  const memberName = "Alex Rivera (Team Member)";

  const passwordHash = await bcrypt.hash(memberPassword, 10);

  const memberUser = await prisma.user.upsert({
    where: { email: memberEmail },
    update: {
      name: memberName,
      passwordHash,
      role: "TEAM_MEMBER",
      isActive: true,
      isPending: false,
    },
    create: {
      name: memberName,
      email: memberEmail,
      passwordHash,
      role: "TEAM_MEMBER",
      isActive: true,
      isPending: false,
    },
  });

  console.log(`Team Member Account created: ${memberUser.email} (ID: ${memberUser.id})`);

  // Find sample project
  const project = await prisma.project.findFirst({
    where: { name: "Enterprise AI Automation Platform" },
    include: { columns: { include: { cards: true } } },
  });

  if (project) {
    // Add to ProjectMember
    await prisma.projectMember.upsert({
      where: {
        projectId_userId: {
          projectId: project.id,
          userId: memberUser.id,
        },
      },
      update: {},
      create: {
        projectId: project.id,
        userId: memberUser.id,
      },
    });

    console.log(`Assigned ${memberUser.name} as member of "${project.name}"`);

    // Assign to a Kanban card
    const inProgressCol = project.columns.find((c) => c.title === "In Progress") || project.columns[0];
    if (inProgressCol && inProgressCol.cards.length > 0) {
      const cardToAssign = inProgressCol.cards[0];
      await prisma.kanbanCard.update({
        where: { id: cardToAssign.id },
        data: {
          assignees: {
            connect: { id: memberUser.id },
          },
        },
      });
      console.log(`Assigned card "${cardToAssign.title}" to ${memberUser.name}`);
    }
  }

  console.log("\n==========================================");
  console.log("TEAM MEMBER LOGIN CREDENTIALS:");
  console.log(`Email:    ${memberEmail}`);
  console.log(`Password: ${memberPassword}`);
  console.log(`Role:     TEAM_MEMBER`);
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
