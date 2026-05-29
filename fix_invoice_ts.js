const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'artifacts', 'mobile-erp', 'app', 'sale', '[id].tsx');
let code = fs.readFileSync(filePath, 'utf8');

// Fix typing for fDate and fCur, and remove references to missing schema properties
code = code.replace(/const fDate = \(dString\) => {/, 'const fDate = (dString: string) => {');
code = code.replace(/const fCur = \(val\) =>/, 'const fCur = (val: number | string) =>');

// Replace missing properties with hardcoded/fallback
code = code.replace(/\$\{sale\.customer_address \|\| /g, '${');
code = code.replace(/\$\{sale\.customer_pan \|\| /g, '${');
code = code.replace(/\$\{sale\.place_of_supply \|\| /g, '${');

// Also shop details doesn't have pan
code = code.replace(/\$\{shopDetails\.shop_pan \|\| /g, '${');

fs.writeFileSync(filePath, code);
console.log('Fixed typescript errors');
