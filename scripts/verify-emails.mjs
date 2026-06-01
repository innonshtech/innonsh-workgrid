import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');
    
    // We can use native MongoDB driver through mongoose to bypass schemas for a raw update
    const db = mongoose.connection.db;
    
    const usersResult = await db.collection('users').updateMany(
      {},
      { $set: { isEmailVerified: true } }
    );
    console.log(`Verified ${usersResult.modifiedCount} admin users.`);
    
    const empResult = await db.collection('employees').updateMany(
      {},
      { $set: { isEmailVerified: true } }
    );
    console.log(`Verified ${empResult.modifiedCount} employees.`);
    
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
