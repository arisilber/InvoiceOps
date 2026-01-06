import { runMigrations } from '../../database/run-migrations.js';

async function setupAuth() {
  try {
    console.log('🔐 Setting up authentication...\n');
    await runMigrations();
    console.log('\n📝 Next steps:');
    console.log('   1. Start your server: npm run server');
    console.log('   2. Start your frontend: npm run dev');
    console.log('   3. Register a new user account');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up authentication:', error);
    process.exit(1);
  }
}

setupAuth();
