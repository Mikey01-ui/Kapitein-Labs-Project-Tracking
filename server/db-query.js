import { PrismaClient } from '@prisma/client';
process.env.DATABASE_URL = "postgresql://milton:Saikik1234@localhost:5432/project_tracking?schema=public";
const prisma = new PrismaClient();
async function main() {
  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      recipient: true
    }
  });
  console.log(notifications.map(n => ({
    title: n.title,
    message: n.message,
    type: n.type,
    recipient: n.recipient.name,
    link: n.link,
    createdAt: n.createdAt
  })));
}
main().catch(console.error).finally(() => prisma.$disconnect());
