import prisma from './src/lib/prisma.js';

// Test if Prisma client recognizes the Menu model
async function testPrismaClient() {
  try {
    // This should work if the Menu model is properly generated
    const menuCount = await prisma.menu.count();
    console.log('Menu model works! Count:', menuCount);
    
    // Test Business with menus relation
    const businessWithMenus = await prisma.business.findFirst({
      include: { menus: true }
    });
    console.log('Business with menus relation works!');
    
    console.log('✅ Prisma client is working correctly');
  } catch (error) {
    console.error('❌ Prisma client error:', error);
  }
}

testPrismaClient();
