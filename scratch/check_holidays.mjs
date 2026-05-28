import 'dotenv/config';
import dbConnect from '../src/lib/db/connect.js';
import Organization from '../src/lib/db/models/crm/organization/Organization.js';
import HolidayList from '../src/lib/db/models/payroll/HolidayList.js';
import User from '../src/lib/db/models/User.js';
import mongoose from 'mongoose';

async function checkHolidays() {
  await dbConnect();
  
  const orgs = await Organization.find();
  console.log(`Total Organizations in DB: ${orgs.length}`);
  orgs.forEach(o => console.log(`  - Org ID: ${o._id}, Name: ${o.name}`));
  
  const lists = await HolidayList.find();
  console.log(`Total Holiday Lists in DB: ${lists.length}`);
  lists.forEach(l => console.log(`  - List ID: ${l._id}, Name: ${l.name}, Year: ${l.year}, OrgId: ${l.organizationId}`));
  
  const admins = await User.find({ role: { $in: ['admin', 'super_admin'] } });
  console.log(`Admins in DB: ${admins.length}`);
  admins.forEach(a => console.log(`  - Admin ID: ${a._id}, Name: ${a.name}, Role: ${a.role}, OrgId: ${a.organizationId}`));
  
  await mongoose.disconnect();
}

checkHolidays().catch(console.error);
