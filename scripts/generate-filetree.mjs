import fs from 'fs';
import path from 'path';

const PUBLIC_DIR = 'public';
const PROJECTS_DIR = path.join(PUBLIC_DIR, 'projects');
const OUTPUT_FILE = 'src/fileTree.ts';

function buildTree(dir, relativeTo = '') {
  const name = path.basename(dir);
  const relPath = path.relative(PUBLIC_DIR, dir).replace(/\\/g, '/');
  const stat = fs.statSync(dir);

  if (stat.isDirectory()) {
    const children = fs.readdirSync(dir)
      .filter(entry => !entry.startsWith('.')) // skip hidden files/dirs
      .map(entry => buildTree(path.join(dir, entry), relPath))
      .sort((a, b) => {
        // directories first, then alphabetical
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'directory' ? -1 : 1;
      });

    return {
      name,
      path: relPath,
      type: 'directory',
      children,
    };
  }

  return {
    name,
    path: relPath,
    type: 'file',
  };
}

const tree = buildTree(PROJECTS_DIR);
const output = `export const fileTree = ${JSON.stringify(tree, null, 2)};\n`;
fs.writeFileSync(OUTPUT_FILE, output, 'utf8');
console.log(`Generated ${OUTPUT_FILE} from ${PROJECTS_DIR}`);
