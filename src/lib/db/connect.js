import mongoose from 'mongoose';

// ───────────────────────────────────────────────────────────────
// PRE-REGISTER commonly populated models so they are available
// in every API route on cold starts. Without these imports,
// .populate() calls will intermittently fail with:
//   "Schema hasn't been registered for model X"
// ───────────────────────────────────────────────────────────────
import '@/lib/db/models/crm/organization/Organization';
import '@/lib/db/models/crm/organization/BusinessUnit';
import '@/lib/db/models/crm/organization/Team';
import '@/lib/db/models/crm/organization/OfficeLocation';
import '@/lib/db/models/crm/Department/department';
import '@/lib/db/models/crm/employee/EmployeeCategory';
import '@/lib/db/models/crm/employee/EmployeeType';
import '@/lib/db/models/DemoRequest';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}
//sample
console.log('🔧 MongoDB URI found:', MONGODB_URI ? 'Yes' : 'No');

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  console.log('🔄 dbConnect() called');
  
  if (cached.conn) {
    console.log('✅ Using cached MongoDB connection');
    return cached.conn;
  }

  if (!cached.promise) {
    console.log('🔌 Creating new MongoDB connection...');
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000, // 10 seconds timeout
      socketTimeoutMS: 45000, // 45 seconds socket timeout
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts)
      .then((mongoose) => {
        console.log('🎉 MongoDB connected successfully!');
        console.log('📊 Database name:', mongoose.connection.db?.databaseName);
        console.log('👤 Connection state:', mongoose.connection.readyState);
        return mongoose;
      })
      .catch((error) => {
        console.error('💥 MongoDB connection failed:', error);
        console.error('🔍 Error details:', error.message);
        cached.promise = null;
        throw error;
      });
  }

  try {
    console.log('⏳ Waiting for MongoDB connection...');
    cached.conn = await cached.promise;
    console.log('🚀 MongoDB connection ready');
  } catch (e) {
    console.error('❌ Error in dbConnect:', e);
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;