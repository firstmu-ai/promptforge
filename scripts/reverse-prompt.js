const content = process.argv.slice(2).join(' ');
if (!content) { console.log('Usage: node scripts/reverse-prompt.js \"paste content here\"'); process.exit(0); }
console.log('Reverse-engineer a reusable prompt from the following content.\n\nOutput:\n1. Reusable prompt\n2. Variables\n3. Style notes\n4. Optimization suggestions\n\nContent:\n' + content);
