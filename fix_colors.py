import re

filepath = 'src/App.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Verify that the color variables are not vt323
content = re.sub(r'text-cyan-400', 'text-sky-300', content)
content = re.sub(r'border-cyan-500\/30', 'border-slate-700/50', content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
