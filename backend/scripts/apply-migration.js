import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fix() {
  // 1. Ensure the enum has COMPLETED value
  await prisma.$executeRaw`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'COMPLETED'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'WithdrawalStatus')
      ) THEN
        ALTER TYPE "WithdrawalStatus" ADD VALUE 'COMPLETED';
      END IF;
    END
    $$;
  `;

  // 2. Update old status values to COMPLETED
  await prisma.$executeRaw`
    UPDATE "withdrawals"
    SET "status" = 'COMPLETED'
    WHERE "status" = 'AWAITING_CONFIRMATION';
  `;

  // 3. Add new columns if they don't exist
  await prisma.$executeRaw`
    ALTER TABLE "withdrawals"
    ADD COLUMN IF NOT EXISTS "bankCode" VARCHAR(20),
    ADD COLUMN IF NOT EXISTS "accountName" VARCHAR(255);
  `;

  console.log('✅ Migration applied successfully');
  await prisma.$disconnect();
}

fix().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
