const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://xpertance:XPERTANCE@cluster0.dnv2io.mongodb.net/hr_payroll?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    // Replicate session route imports & logic
    const Employee = require('./src/lib/db/models/payroll/Employee').default || require('./src/lib/db/models/payroll/Employee');
    const Role = require('./src/lib/db/models/crm/Permission/Role').default || require('./src/lib/db/models/crm/Permission/Role');
    
    const employee = await Employee.findOne({ 'personalDetails.firstName': { $regex: /aniket/i } }).lean();
    console.log('Employee found:', employee.personalDetails.firstName, 'roleId:', employee.roleId);
    
    if (employee.roleId) {
      try {
        const roleData = await Role.findById(employee.roleId).lean();
        console.log('Role found:', roleData.name, 'permissions:', roleData.permissions);
      } catch (err) {
        console.error('Error fetching role:', err);
      }
    }
    
    mongoose.connection.close();
  });
