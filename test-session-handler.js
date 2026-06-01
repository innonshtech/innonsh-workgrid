const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const JWT_SECRET = '50560daf592e4a3fd93fc1ed75e13ebb88425fab6a5357024f126f8148ab9efe';

mongoose.connect('mongodb+srv://xpertance:XPERTANCE@cluster0.dnv2io.mongodb.net/hr_payroll?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const Employee = require('./src/lib/db/models/payroll/Employee').default || require('./src/lib/db/models/payroll/Employee');
    const Role = require('./src/lib/db/models/crm/Permission/Role').default || require('./src/lib/db/models/crm/Permission/Role');
    
    // Find Aniket
    const aniket = await Employee.findOne({ 'personalDetails.firstName': { $regex: /aniket/i } }).lean();
    if (!aniket) {
      console.log('Aniket not found');
      mongoose.connection.close();
      return;
    }
    
    // Generate a valid JWT token for Aniket
    const token = jwt.sign({ id: aniket._id.toString(), role: 'employee' }, JWT_SECRET);
    
    // Update Aniket's sessionToken to this token in DB so the findOne matches
    await Employee.updateOne({ _id: aniket._id }, { $set: { sessionToken: token } });
    
    console.log('Generated token for Aniket:', token);
    
    // Now simulate the GET /api/v1/session handler logic
    const id = aniket._id.toString();
    const employee = await Employee.findOne({ _id: id, sessionToken: token }).lean();
    
    let permissions = [];
    if (employee.roleId) {
      const roleData = await Role.findById(employee.roleId).lean();
      if (roleData && roleData.permissions && Array.isArray(roleData.permissions)) {
        permissions = [...new Set([...permissions, ...roleData.permissions])];
      }
    }
    
    const userResponse = {
      id: employee._id.toString(),
      email: employee.personalDetails.email,
      name: `${employee.personalDetails.firstName} ${employee.personalDetails.lastName}`,
      role: employee.role || 'employee',
      department: employee.jobDetails.department,
      designation: employee.jobDetails.designation,
      permissions: permissions,
      roleId: employee.roleId ? employee.roleId.toString() : null,
    };
    
    console.log('Simulated session response:', userResponse);
    
    mongoose.connection.close();
  });
