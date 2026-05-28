const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const users = mongoose.connection.collection('users');
    const user = await users.findOne({ email: 'info@innonsh.com' });
    console.log(JSON.stringify(user, null, 2));
    process.exit(0);
}
check();
