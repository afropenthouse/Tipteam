import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function activateUserAndSubscribe() {
  const email = 'fofoladipo@gmail.com';
  
  try {
    console.log(`Looking for user: ${email}`);
    
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
      include: { subscriptions: true }
    });
    
    if (!user) {
      console.log(`User ${email} not found. Creating new user...`);
      
      // Create the user with a default password
      const defaultPassword = 'TempPassword123!';
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      
      const newUser = await prisma.user.create({
        data: {
          fullName: 'MPearl Health & Beauty',
          email,
          password: hashedPassword,
          isVerified: true, // Activate the account
        },
        include: { subscriptions: true }
      });
      
      console.log(`Created new user: ${newUser.fullName} (${newUser.email})`);
      console.log(`Default password: ${defaultPassword}`);
      
      // Create 3-month subscription
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 3);
      
      const subscription = await prisma.subscription.create({
        data: {
          userId: newUser.id,
          planType: 'THREE_MONTHS',
          duration: 3,
          price: 3000000, // 30,000 NGN in kobo
          status: 'ACTIVE',
          startDate,
          endDate,
          paystackRef: 'ADMIN_ACTIVATION_' + Date.now(),
        },
      });
      
      console.log(`Created 3-month subscription for user ${newUser.email}`);
      console.log(`Subscription expires: ${endDate.toISOString()}`);
      console.log(`Subscription ID: ${subscription.id}`);
      
    } else {
      console.log(`Found existing user: ${user.fullName} (${user.email})`);
      console.log(`Current verification status: ${user.isVerified ? 'Verified' : 'Not verified'}`);
      
      // Activate the user if not already activated
      if (!user.isVerified) {
        await prisma.user.update({
          where: { id: user.id },
          data: { isVerified: true },
        });
        console.log(`Activated user account for ${user.email}`);
      } else {
        console.log(`User ${user.email} is already activated`);
      }
      
      // Check for existing active subscriptions
      const activeSubscription = user.subscriptions.find(sub => 
        sub.status === 'ACTIVE' && new Date(sub.endDate) > new Date()
      );
      
      if (activeSubscription) {
        console.log(`User already has active subscription until: ${activeSubscription.endDate}`);
      } else {
        // Create 3-month subscription
        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 3);
        
        const subscription = await prisma.subscription.create({
          data: {
            userId: user.id,
            planType: 'THREE_MONTHS',
            duration: 3,
            price: 3000000, // 30,000 NGN in kobo
            status: 'ACTIVE',
            startDate,
            endDate,
            paystackRef: 'ADMIN_ACTIVATION_' + Date.now(),
          },
        });
        
        console.log(`Created 3-month subscription for user ${user.email}`);
        console.log(`Subscription expires: ${endDate.toISOString()}`);
        console.log(`Subscription ID: ${subscription.id}`);
      }
    }
    
    console.log('\n✅ Account activation and subscription completed successfully!');
    
  } catch (error) {
    console.error('Error activating user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
activateUserAndSubscribe();
