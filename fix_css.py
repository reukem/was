import re

filepath = 'src/index.css'
with open(filepath, 'r', encoding='utf-8') as f:
    css_content = f.read()

# Move the @import to the very top
import_statement = "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&family=Orbitron:wght@400;700;900&display=swap');"
css_content = css_content.replace(import_statement, "")
css_content = import_statement + "\n" + css_content.strip()

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(css_content)
