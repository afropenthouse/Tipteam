import { PrismaClient } from "@prisma/client";

console.log("Initializing Prisma client...");
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "Set" : "Not set");

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// Test the connection
prisma.$connect()
  .then(() => {
    console.log("✅ Database connected successfully");
  })
  .catch((error) => {
    console.error("❌ Database connection failed:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      meta: error.meta,
      clientVersion: error.clientVersion
    });
  });

export default prisma;