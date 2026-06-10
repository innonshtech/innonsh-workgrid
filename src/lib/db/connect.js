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
import '@/lib/db/models/staffing/StaffingClient';
import '@/lib/db/models/staffing/StaffingRequirement';
import '@/lib/db/models/staffing/StaffingCandidate';
import '@/lib/db/models/staffing/StaffingSubmission';

// Fix for Node.js SRV DNS resolution failure (querySrv ECONNREFUSED) on local DNS configurations
if (typeof window === 'undefined') {
  try {
    const dns = require('dns');
    const servers = dns.getServers();
    if (servers.includes('127.0.0.1') || servers.includes('::1') || servers.length === 0) {
      dns.setServers(['8.8.8.8', '8.8.4.4']);
      console.log('🔧 Local DNS detected. Fallback DNS servers set to Google DNS (8.8.8.8, 8.8.4.4)');
    }
  } catch (e) {
    // Ignore error if dns module is not available (e.g. edge runtime)
  }
}

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

  if (typeof window === 'undefined') {
    try {
      const dns = await import('dns');
      const servers = dns.getServers();
      console.log('🔍 Current DNS servers inside dbConnect:', servers);
      if (servers.includes('127.0.0.1') || servers.includes('::1') || servers.length === 0 || servers.includes('127.0.0.53')) {
        dns.setServers(['8.8.8.8', '8.8.4.4']);
        console.log('🔧 DNS fallback: successfully set Node.js DNS servers to Google DNS (8.8.8.8) inside dbConnect');
      }
    } catch (e) {
      console.warn('⚠️ Could not configure DNS fallback inside dbConnect:', e);
    }
  }
  
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