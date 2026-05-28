const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const Task = mongoose.model('Task', new mongoose.Schema({
        title: String,
        assignedTo: mongoose.Schema.Types.ObjectId,
        assignedBy: mongoose.Schema.Types.ObjectId,
        status: String
    }));
    const Employee = mongoose.model('Employee', new mongoose.Schema({
        personalDetails: { firstName: String, lastName: String }
    }));

    const tasks = await Task.find({ title: /Payroll/i }).lean();
    console.log("TASKS FOUND:", JSON.stringify(tasks, null, 2));

    for (const task of tasks) {
        if (task.assignedTo) {
            const emp = await Employee.findById(task.assignedTo);
            console.log(`Task ${task._id} assigned to ID ${task.assignedTo}. Employee found:`, emp?.personalDetails || "NULL");
        }
    }
    process.exit(0);
}
run();
