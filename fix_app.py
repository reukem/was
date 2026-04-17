import re

filepath = 'src/App.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix createGlassMaterial properties
content = re.sub(r'roughness:\s*0\.05,\s*//\s*highly reflective', 'roughness: 0.0, // Borosilicate peak aesthetic', content)
content = re.sub(r'ior:\s*1\.5,\s*//\s*Index of Refraction for standard glass', 'ior: 1.45, // Borosilicate IOR', content)
content = re.sub(r'thickness:\s*0\.1,\s*//\s*gives volume for refraction', 'thickness: 0.02, // Borosilicate realistic wall thickness', content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed App.tsx")
