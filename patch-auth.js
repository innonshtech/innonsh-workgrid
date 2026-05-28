const fs = require('fs');
const path = require('path');

const empBase = 'src/app/api/v1/employee';

function rewriteAuth(dir) {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const fullPath = path.join(dir, item);
        if (fs.statSync(fullPath).isDirectory()) {
            rewriteAuth(fullPath);
        } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            
            // Replace `authorize(user, [...])` with `authorize(user, ['employee'])`
            const oldContent = content;
            content = content.replace(/authorize\(user,\s*\[([^\]]*)\]\)/g, "authorize(user, ['employee'])");
            
            if (content !== oldContent) {
                fs.writeFileSync(fullPath, content);
                console.log('Patched auth in: ' + fullPath);
            }
        }
    }
}

rewriteAuth(path.join(empBase, 'payroll'));
rewriteAuth(path.join(empBase, 'tasks'));
console.log("Done rewriting authentication!");
