const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, 'artifacts', 'mobile-erp', 'app', '(tabs)', 'pos.tsx'),
  path.join(__dirname, 'artifacts', 'mobile-erp', 'app', '(tabs)', 'inventory.tsx'),
  path.join(__dirname, 'artifacts', 'mobile-erp', 'app', 'product', 'add.tsx'),
  path.join(__dirname, 'artifacts', 'mobile-erp', 'components', 'ProductImage.tsx')
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let code = fs.readFileSync(file, 'utf8');
    if (!code.includes("n.includes('ac')")) {
      code = code.replace(
        /if \(n\.includes\('watch'\)\) return 'watch';/g,
        `if (n.includes('watch')) return 'watch';\n    if (n.includes('ac') || n.includes('conditioner') || n.includes('air')) return 'wind';`
      );
      fs.writeFileSync(file, code);
    }
  }
}
console.log('Added AC mapping to wind icon.');
