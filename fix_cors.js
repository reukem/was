import fs from 'fs';

const path = './src/App.tsx';
let data = fs.readFileSync(path, 'utf8');

data = data.replace(
    'console.error("Gemini API Error:", error);',
    'console.error("Gemini API Error:", error);' // do nothing
);

fs.writeFileSync(path, data);
