const fs = require('fs');
const path = require('path');

function replaceInDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      replaceInDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf-8');
      content = content.replace(/["']\.\.\/\.\.\/\.\.\/lib\/utils["']/g, '"../../lib/utils"');
      fs.writeFileSync(fullPath, content, 'utf-8');
    }
  }
}

replaceInDir(path.join(__dirname, '../components'));
