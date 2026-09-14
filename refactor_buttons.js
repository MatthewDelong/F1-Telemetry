const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function findFiles(dir, filter, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findFiles(filePath, filter, fileList);
    } else if (filter(filePath)) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const jsxFiles = findFiles(srcDir, (f) => f.endsWith('.jsx'));

let modifiedCount = 0;

for (const file of jsxFiles) {
  let content = fs.readFileSync(file, 'utf8');
  
  if (content.includes('<button') || content.includes('</button>')) {
    // Determine relative path to Button.jsx
    const buttonPath = path.join(srcDir, 'components', 'Button.jsx');
    let relPath = path.relative(path.dirname(file), buttonPath).replace(/\\/g, '/');
    if (!relPath.startsWith('.')) {
      relPath = './' + relPath;
    }
    // Remove .jsx extension
    relPath = relPath.replace(/\.jsx$/, '');

    // Check if Button is already imported
    const hasButtonImport = content.includes('import { Button }') || content.includes('import {Button}');
    
    if (!hasButtonImport) {
      // Find the last import statement
      const importRegex = /import\s+.*?['"].*?['"];?\n/g;
      let lastMatch;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        lastMatch = match;
      }
      
      const importStatement = `import { Button } from "${relPath}";\n`;
      
      if (lastMatch) {
        const insertPos = lastMatch.index + lastMatch[0].length;
        content = content.slice(0, insertPos) + importStatement + content.slice(insertPos);
      } else {
        content = importStatement + content;
      }
    }

    // Replace tags
    // Be careful with <button.../> and <button>...</button>
    // We will do simple string replacement for now, which usually works if they are formatted normally.
    content = content.replace(/<button(\s|>)/g, '<Button$1');
    content = content.replace(/<\/button>/g, '</Button>');

    fs.writeFileSync(file, content, 'utf8');
    modifiedCount++;
    console.log(`Updated ${path.relative(__dirname, file)}`);
  }
}

console.log(`Successfully refactored ${modifiedCount} files.`);
