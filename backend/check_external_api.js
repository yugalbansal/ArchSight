import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const nodes = await prisma.architectureNode.findMany({
    where: { type: 'ExternalAPI' },
    take: 5
  });
  for (const n of nodes) {
    console.log("ID:", n.id);
    console.log("Name:", n.name);
    console.log("Metadata:", JSON.stringify(n.metadata, null, 2));
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
