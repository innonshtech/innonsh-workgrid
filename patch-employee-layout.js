const fs = require('fs');

const file = 'src/app/employee/layout.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/href: "\/admin\/payroll\/my-payslip"/g, 'href: "/employee/my-payslip"');
content = content.replace(/href: "\/admin\/payroll\/loans"/g, 'href: "/employee/loans"');
content = content.replace(/href: "\/attendance"/g, 'href: "/employee/attendance"');
content = content.replace(/href: "\/tasks\/projects"/g, 'href: "/employee/projects"');

fs.writeFileSync(file, content);
console.log('Fixed Employee layout hrefs explicitly to /employee/... routes!');
