import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const nodeModulesDir = path.join(rootDir, 'node_modules');

if (!fs.existsSync(nodeModulesDir)) {
  process.exit(0);
}

const suffixedDirs = [];

const walk = (dirPath) => {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const fullPath = path.join(dirPath, entry.name);

    if (entry.name.endsWith(' 2')) {
      suffixedDirs.push(fullPath);
    }

    walk(fullPath);
  }
};

walk(nodeModulesDir);

let repairedCount = 0;

// Rename deepest paths first so child folders do not move before parents.
suffixedDirs
  .sort((a, b) => b.length - a.length)
  .forEach((currentPath) => {
    const repairedPath = currentPath.slice(0, -2);

    if (fs.existsSync(repairedPath)) {
      return;
    }

    fs.renameSync(currentPath, repairedPath);
    repairedCount += 1;
  });

if (repairedCount > 0) {
  console.log(`Repaired ${repairedCount} duplicated node_modules directories.`);
}
