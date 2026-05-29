const fs = require('fs');
const path = require('path');

const appDir = path.join(__dirname, 'artifacts', 'mobile-erp', 'app');

const filesToFix = [
  'settings.tsx',
  'users.tsx',
  'suppliers.tsx',
  'expenses.tsx',
  'categories-brands.tsx'
];

for (const file of filesToFix) {
  const filePath = path.join(appDir, file);
  if (!fs.existsSync(filePath)) continue;

  let code = fs.readFileSync(filePath, 'utf8');

  // Add useRouter if not present
  if (!code.includes('import { useRouter }')) {
    code = code.replace(/import React/, "import { useRouter } from 'expo-router';\nimport React");
  }

  // Ensure router is initialized
  if (!code.includes('const router = useRouter()') && !code.includes('const router = useRouter();')) {
    code = code.replace(/export default function[^{]+\{\n/, "$&\n  const router = useRouter();\n");
  }

  // For settings.tsx
  if (file === 'settings.tsx') {
    code = code.replace(/Alert\.alert\('Saved ✅', 'Settings updated successfully'\);/, 
`if (typeof window !== 'undefined' && window.alert) {
      window.alert('Settings updated successfully');
      if (router.canGoBack()) router.back(); else router.replace('/');
    } else {
      Alert.alert('Saved ✅', 'Settings updated successfully', [{ text: 'OK', onPress: () => { if (router.canGoBack()) router.back(); else router.replace('/'); } }]);
    }`);
  }

  // For users, suppliers, expenses, categories-brands
  const match = code.match(/Alert\.alert\('Success ✅', '[^']+'\);/g);
  if (match) {
    for (const m of match) {
      const msg = m.split(", '")[1].split("');")[0];
      code = code.replace(m, 
`if (typeof window !== 'undefined' && window.alert) {
      window.alert('${msg}');
      if (router.canGoBack()) router.back(); else router.replace('/');
    } else {
      Alert.alert('Success ✅', '${msg}', [{ text: 'OK', onPress: () => { if (router.canGoBack()) router.back(); else router.replace('/'); } }]);
    }`);
    }
  }

  // For categories-brands.tsx where alert might be slightly different
  const match2 = code.match(/Alert\.alert\('Success', '[^']+'\);/g);
  if (match2) {
    for (const m of match2) {
      const msg = m.split(", '")[1].split("');")[0];
      code = code.replace(m, 
`if (typeof window !== 'undefined' && window.alert) {
      window.alert('${msg}');
      if (router.canGoBack()) router.back(); else router.replace('/');
    } else {
      Alert.alert('Success', '${msg}', [{ text: 'OK', onPress: () => { if (router.canGoBack()) router.back(); else router.replace('/'); } }]);
    }`);
    }
  }

  fs.writeFileSync(filePath, code);
}

// Now for product/add.tsx
const addPath = path.join(appDir, 'product', 'add.tsx');
if (fs.existsSync(addPath)) {
  let addCode = fs.readFileSync(addPath, 'utf8');
  if (!addCode.includes("typeof window !== 'undefined' && window.alert")) {
    addCode = addCode.replace(/Alert\.alert\('Success ✅', 'Product added successfully', \[[\s\S]*?\]\);/g, 
`if (typeof window !== 'undefined' && window.alert) {
        window.alert('Product added successfully');
        router.replace(\`/product/\${id}\` as any);
      } else {
        Alert.alert('Success ✅', 'Product added successfully', [
          { text: 'View', onPress: () => router.replace(\`/product/\${id}\` as any) },
          { text: 'Add Another', onPress: () => { 
            setName(''); setBarcode(''); setCostPrice(''); setSellingPrice(''); setGstRate(''); setStock('0'); setDescription(''); setImageUri(''); setModel(''); setVariant(''); setCategoryId(0); setBrandId(0); setShowNewBrandInput(false); setNewBrandName('');
          } },
        ]);
      }`);
    fs.writeFileSync(addPath, addCode);
  }
}

console.log('Navigation on save fixed.');
