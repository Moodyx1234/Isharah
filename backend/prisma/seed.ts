import { PrismaClient, SessionStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱  Starting seed...');

  const session = await prisma.session.upsert({
    where: { code: 'DEMO01' },
    update: {},
    create: {
      code: 'DEMO01',
      title: 'مقدمة في الذكاء الاصطناعي',
      subject: 'علوم الحاسب',
      lecturerName: 'د. أحمد الزهراني',
      status: SessionStatus.WAITING,
    },
  });

  console.log(`✅  Demo session: "${session.title}" (code: ${session.code})`);
  console.log('\n🎉  Seed complete. No accounts needed — use the session code to join.');
}

main()
  .catch((err) => {
    console.error('❌  Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
