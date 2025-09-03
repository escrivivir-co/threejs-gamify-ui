#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function copyDirectory(src, dest) {
  if (!fs.existsSync(src)) {
    console.log(`⚠️  Source directory ${src} does not exist`);
    return;
  }

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function main() {
  const packageRoot = path.dirname(__dirname);
  const sourceDir = path.join(packageRoot, 'dist', 'public');
  
  // Try to find the state-machine-mcp-driver directory
  let targetBase = null;
  
  // Check if we're being installed as dependency
  const nodeModulesPath = path.join(packageRoot, '..', '..', 'public', 'threejs-ui');
  const localDevPath = path.join(packageRoot, '..', 'state-machine-mcp-driver', 'public', 'threejs-ui');
  
  if (fs.existsSync(path.join(packageRoot, '..', '..', 'package.json'))) {
    // We're in node_modules
    targetBase = nodeModulesPath;
  } else if (fs.existsSync(path.join(packageRoot, '..', 'state-machine-mcp-driver'))) {
    // We're in development
    targetBase = localDevPath;
  }
  
  if (!targetBase) {
    console.log('⚠️  Could not find target directory for threejs-ui assets');
    return;
  }

  if (!fs.existsSync(sourceDir)) {
    console.log(`⚠️  Built assets not found at ${sourceDir}. Please run 'npm run build' first.`);
    return;
  }

  console.log(`📦 Copying ThreeJS UI assets from ${sourceDir} to ${targetBase}`);
  
  try {
    copyDirectory(sourceDir, targetBase);
    console.log('✅ ThreeJS UI assets copied successfully!');
    console.log(`📍 Assets available at: ${targetBase}`);
  } catch (error) {
    console.error('❌ Error copying assets:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { copyDirectory, main };
