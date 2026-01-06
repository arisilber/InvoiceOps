import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import pool from '../db/connection.js';

dotenv.config();

const email = process.argv[2];
const password = process.argv[3];
const name = process.argv[4];

if (!email || !password || !name) {
  console.error('❌ Usage: node server/scripts/create-user.js <email> <password> <name>');
  console.error('');
  console.error('Example:');
  console.error('  node server/scripts/create-user.js admin@example.com mypassword "Admin User"');
  process.exit(1);
}

async function createUser() {
  try {
    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      console.error(`❌ User with email "${email}" already exists.`);
      await pool.end();
      process.exit(1);
    }

    // Validate password length
    if (password.length < 6) {
      console.error('❌ Password must be at least 6 characters long.');
      await pool.end();
      process.exit(1);
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING id, email, name, created_at`,
      [email, passwordHash, name]
    );

    const user = result.rows[0];

    console.log('✅ User created successfully!');
    console.log('');
    console.log('User details:');
    console.log(`  ID: ${user.id}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Name: ${user.name}`);
    console.log(`  Created: ${user.created_at}`);
    console.log('');
    console.log('The user can now log in with these credentials.');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating user:');
    console.error(`   ${error.message}`);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    await pool.end();
    process.exit(1);
  }
}

createUser();

