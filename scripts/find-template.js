import fs from 'node:fs';
const templates = JSON.parse(fs.readFileSync(new URL('../templates/free-templates.json', import.meta.url), 'utf8'));
const query = process.argv.slice(2).join(' ').toLowerCase();
if (!query) { console.log('Usage: node scripts/find-template.js <query>'); process.exit(0); }
const words = query.split(/\s+/).filter(Boolean);
const scored = templates.map((t) => {
  const text = [t.name, t.industry, t.scenario, t.platform, ...(t.tags || []), t.prompt].join(' ').toLowerCase();
  const score = words.reduce((sum, word) => sum + (text.includes(word) ? 1 : 0), 0);
  return { score, template: t };
}).filter((item) => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 10);
for (const item of scored) {
  console.log(item.template.id + ' | ' + item.template.name + ' | ' + item.template.industry + ' | ' + item.template.scenario);
}
