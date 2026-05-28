const fs = require('fs');

try {
    let layout = fs.readFileSync('src/app/admin/layout.jsx', 'utf8');

    // Fix Admin Routes
    layout = layout.replace(/href: "\/payroll/g, 'href: "/admin/payroll');
    layout = layout.replace(/href: "\/dashboard"/g, 'href: "/admin/dashboard"');
    layout = layout.replace(/href: "\/dashboard\/crm"/g, 'href: "/super-admin/organization"');
    layout = layout.replace(/href: "\/crm/g, 'href: "/super-admin/organization/crm');
    layout = layout.replace(/href: "\/logs"/g, 'href: "/super-admin/audit-logs"');

    // Fix Employee Routes
    layout = layout.replace(/href: "\/ess"/g, 'href: "/employee/dashboard"');
    layout = layout.replace(/href: "\/timesheets"/g, 'href: "/employee/timesheets"');

    // Fix the role check in DashboardLayout Content Name
    layout = layout.replace(/role === 'admin' \? '\/dashboard'/g, 'role === "admin" ? "/admin/dashboard"');
    layout = layout.replace(/role === 'employee' \? '\/dashboard'/g, 'role === "employee" ? "/employee/dashboard"');
    layout = layout.replace(/role === 'supervisor' \? '\/dashboard'/g, 'role === "supervisor" ? "/employee/dashboard"');

    fs.writeFileSync('src/app/admin/layout.jsx', layout);
    fs.copyFileSync('src/app/admin/layout.jsx', 'src/app/employee/layout.jsx');
    fs.copyFileSync('src/app/admin/layout.jsx', 'src/app/super-admin/layout.jsx');
    console.log('Sidebar links patched and layouts duplicated securely.');
} catch (e) {
    console.error(e);
}
