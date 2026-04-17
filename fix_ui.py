import re

# App.tsx UI fonts
filepath = 'src/App.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# I need to find "font-mono" or "font-vt323" and remove them if they are still there
# Let's check if there are any vt323
content = re.sub(r'font-vt323', 'font-sans', content)

# Check for depthWrite: false in createGlassMaterial
if 'depthWrite' not in re.search(r'return new THREE\.MeshPhysicalMaterial\(\{([^}]+)\}\);', content).group(1):
    # Add it
    content = re.sub(r'(thickness:\s*0\.02,\s*//\s*Borosilicate realistic wall thickness)', r'\1,\n        depthWrite: false', content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

# index.css UI CSS Variables
filepath = 'src/index.css'
with open(filepath, 'r', encoding='utf-8') as f:
    css_content = f.read()

# Fix the duplicate cyan bug and replace retro colors
css_content = re.sub(r'--color-lab-cyan-dark:\s*#[0-9a-fA-F]+;', '--color-lab-cyan-dark: #0f172a;', css_content)
css_content = re.sub(r'--color-lab-cyan:\s*#[0-9a-fA-F]+;', '--color-lab-cyan: #38bdf8;', css_content)

# Remove any remaining vt323 references
css_content = re.sub(r"font-family:\s*['\"]VT323['\"].*?;", "font-family: 'Inter', sans-serif;", css_content)


with open(filepath, 'w', encoding='utf-8') as f:
    f.write(css_content)

print("Fixed UI files")
