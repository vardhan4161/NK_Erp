const fs = require('fs');
const path = require('path');

const posPath = path.join(__dirname, 'artifacts', 'mobile-erp', 'app', '(tabs)', 'pos.tsx');
const invPath = path.join(__dirname, 'artifacts', 'mobile-erp', 'app', '(tabs)', 'inventory.tsx');
const addPath = path.join(__dirname, 'artifacts', 'mobile-erp', 'app', 'product', 'add.tsx');
const prodImgPath = path.join(__dirname, 'artifacts', 'mobile-erp', 'components', 'ProductImage.tsx');

function replaceImagesInFile(filePath, isPos) {
  if (!fs.existsSync(filePath)) return;
  let code = fs.readFileSync(filePath, 'utf8');

  const getIconCode = `const getCatIcon = (name: string) => {
    if (!name) return 'box';
    const n = name.toLowerCase();
    if (n.includes('mobile') || n.includes('phone')) return 'smartphone';
    if (n.includes('laptop') || n.includes('computer')) return 'monitor';
    if (n.includes('audio') || n.includes('headphone')) return 'headphones';
    if (n.includes('tv') || n.includes('television')) return 'tv';
    if (n.includes('watch')) return 'watch';
    if (n.includes('camera')) return 'camera';
    return 'box';
  };`;

  if (!code.includes('getCatIcon')) {
    code = code.replace('export default function ', getIconCode + '\n\nexport default function ');
  }

  // Replace Category Image
  code = code.replace(
    /<Image[\s\S]*?source=\{\{\s*uri:\s*cat\.image_uri[\s\S]*?resizeMode="cover"\s*\/>/g,
    `<View style={[styles.catImage, { backgroundColor: colors.primary + '22', alignItems: 'center', justifyContent: 'center' }]}>
                  <Feather name={getCatIcon(cat.name) as any} size={28} color={colors.primary} />
                </View>`
  );

  // Replace Product Image (pos.tsx)
  if (isPos) {
    code = code.replace(
      /<Image[\s\S]*?source=\{\{\s*uri:\s*p\.image_uri[\s\S]*?resizeMode="cover"\s*\/>/g,
      `<View style={[styles.prodImage, { backgroundColor: colors.border + '66', alignItems: 'center', justifyContent: 'center' }]}>
                      <Feather name={getCatIcon(selectedCat?.name || '') as any} size={40} color={colors.textSecondary} />
                    </View>`
    );
  } else {
    // inventory.tsx product image
    code = code.replace(
      /<Image[\s\S]*?source=\{\{\s*uri:\s*p\.image_uri[\s\S]*?resizeMode="cover"[\s\S]*?\/>/g,
      `<View style={[styles.prodImage, { backgroundColor: colors.border + '66', alignItems: 'center', justifyContent: 'center' }]}>
                    <Feather name={getCatIcon(selectedCat?.name || '') as any} size={30} color={colors.textSecondary} />
                  </View>`
    );
  }

  fs.writeFileSync(filePath, code);
}

replaceImagesInFile(posPath, true);
replaceImagesInFile(invPath, false);

// Now for add.tsx (category select step)
let addCode = fs.readFileSync(addPath, 'utf8');
const addIconCode = `const getCatIcon = (name: string) => {
    if (!name) return 'box';
    const n = name.toLowerCase();
    if (n.includes('mobile') || n.includes('phone')) return 'smartphone';
    if (n.includes('laptop') || n.includes('computer')) return 'monitor';
    if (n.includes('audio') || n.includes('headphone')) return 'headphones';
    if (n.includes('tv') || n.includes('television')) return 'tv';
    if (n.includes('watch')) return 'watch';
    if (n.includes('camera')) return 'camera';
    return 'box';
  };`;
if (!addCode.includes('getCatIcon')) {
  addCode = addCode.replace('export default function AddProductScreen', addIconCode + '\n\nexport default function AddProductScreen');
}
addCode = addCode.replace(
  /<Image source=\{\{ uri: cat\.image_uri[\s\S]*?resizeMode="cover" \/>/g,
  `<View style={{ width: '100%', height: 80, marginBottom: 8, backgroundColor: colors.primary + '22', alignItems: 'center', justifyContent: 'center', borderRadius: 12 }}>
                      <Feather name={getCatIcon(cat.name) as any} size={32} color={colors.primary} />
                    </View>`
);
fs.writeFileSync(addPath, addCode);

// Now for ProductImage.tsx
let prodImgCode = fs.readFileSync(prodImgPath, 'utf8');
const prodImgReplace = `  const iconName = (categoryIcon || 'package') as keyof typeof Feather.glyphMap;
  return (
    <View style={[styles.iconBox, { width: size, height: size, borderRadius, backgroundColor }]}>
      <Feather name={iconName} size={size * 0.45} color={iconColor} />
    </View>
  );`;

prodImgCode = prodImgCode.replace(/  if \(hasProductImage\) \{[\s\S]*?\}\n/g, '');
prodImgCode = prodImgCode.replace(/  if \(hasCategoryImage\) \{[\s\S]*?\}\n/g, '');
prodImgCode = prodImgCode.replace(/  const hasProductImage =[\s\S]*?hasProductImage;\n/g, '');

fs.writeFileSync(prodImgPath, prodImgCode);

console.log('Images replaced with icons successfully.');
