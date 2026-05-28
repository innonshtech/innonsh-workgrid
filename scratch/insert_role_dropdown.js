const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src/components/payroll/employee-list.jsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// Find the line index where Search Employees ends
// It should be after the search input container's closing div
let insertIndex = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Search by name, ID, or department...')) {
        // Find the next </div> (inner) and then the next </div> (outer)
        let foundInner = false;
        for (let j = i; j < i + 20; j++) {
            if (lines[j].includes('</div>')) {
                if (!foundInner) {
                    foundInner = true;
                } else {
                    insertIndex = j + 1;
                    break;
                }
            }
        }
        break;
    }
}

if (insertIndex !== -1) {
    const roleDropdown = [
        '              <div className="lg:col-span-2">',
        '                <label className="block text-sm font-medium text-slate-700 mb-2">Role</label>',
        '                <select',
        '                  value={roleFilter}',
        '                  onChange={(e) => setRoleFilter(e.target.value)}',
        '                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-white"',
        '                >',
        '                  <option value="">All Roles</option>',
        '                  <option value="admin">Admin</option>',
        '                  <option value="employee">Employee</option>',
        '                  <option value="manager">Manager</option>',
        '                </select>',
        '              </div>'
    ];
    
    lines.splice(insertIndex, 0, ...roleDropdown);
    fs.writeFileSync(filePath, lines.join('\n'));
    console.log("Successfully inserted Role dropdown at line", insertIndex);
} else {
    console.error("Could not find insertion point");
}
