const fs = require('fs');
const path = require('path');

const dataTsPath = path.join(__dirname, '../lib/data.ts');
let code = fs.readFileSync(dataTsPath, 'utf8');

const helperCode = `
// Date helpers for dynamic dummy data
const pad = (n: number) => String(n).padStart(2, '0');
const getFormattedDate = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return \`\${d.getFullYear()}-\${pad(d.getMonth() + 1)}-\${pad(d.getDate())}\`;
};
const getShortDate = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return \`\${d.getMonth() + 1}/\${d.getDate()}\`;
};
`;

code = code.replace('// Categories for cafe items', helperCode + '\n// Categories for cafe items');

const mapFullDate = {
  '"2026-04-16"': 'getFormattedDate(3)',
  '"2026-04-15"': 'getFormattedDate(2)',
  '"2026-04-14"': 'getFormattedDate(1)',
  '"2026-04-13"': 'getFormattedDate(0)',
  '"2026-04-12"': 'getFormattedDate(-1)',
  '"2026-04-11"': 'getFormattedDate(-2)',
  '"2026-04-10"': 'getFormattedDate(-3)',
  '"2026-04-09"': 'getFormattedDate(-4)',
  '"2026-04-08"': 'getFormattedDate(-5)',
  '"2026-04-07"': 'getFormattedDate(-6)',
};

for (const [key, val] of Object.entries(mapFullDate)) {
  code = code.split(key).join(val);
}

const forecastRegex = /export const forecastData = \[([\s\S]*?)\]/m;
const forecastMatch = code.match(forecastRegex);
if (forecastMatch) {
  let inner = forecastMatch[1];
  inner = inner.replace(/date: "[^"]+",\s*/g, '');
  const replacement = `export const forecastData = [
${inner}
].map((item, index) => ({
  date: getShortDate(index - 7),
  ...item
}))`;
  code = code.replace(forecastMatch[0], replacement);
}

fs.writeFileSync(dataTsPath, code);
console.log('Successfully updated dates in lib/data.ts');
