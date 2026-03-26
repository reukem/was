const fs = require('fs');

const appFile = 'src/App.tsx';
let content = fs.readFileSync(appFile, 'utf8');

content = content.replace(
    /const detail = `Đã trộn \$\{CHEMICALS\[source\.contents\.chemicalId\]\.name\} vào \$\{CHEMICALS\[targetChemId\]\.name\} ở \$\{heaterTemp\}°C\. Tạo ra \$\{mixResult\.reaction\.productName\}\.`;/,
    'const detail = `I just mixed ${CHEMICALS[source.contents.chemicalId].name} and ${CHEMICALS[targetChemId].name}. Explain the reaction.`;'
);

content = content.replace(
    /return this\.chat\(`I just observed the following: \$\{detail\}\. Explain the reaction\.`\);/,
    'return this.chat(detail);'
);

fs.writeFileSync(appFile, content);
console.log("Hookups patched.");
