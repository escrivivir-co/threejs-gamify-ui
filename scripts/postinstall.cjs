#!/usr/bin/env node

/**
 * ThreeJS AlephScript SDK PostInstall Script
 * Copies ThreeJS Angular app to consumer's public_templates directory
 * Following the pattern established by other AlephScript SDKs
 */

const fs = require('fs');
const path = require('path');

function findProjectRoot(startDir = process.cwd()) {
  let currentDir = startDir;
  
  while (currentDir !== path.dirname(currentDir)) {
    const packageJsonPath = path.join(currentDir, 'package.json');
    
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        
        // Check if this looks like a consumer project (has public_templates or is state-machine-mcp-driver)
        const publicTemplatesDir = path.join(currentDir, 'public_templates');
        const srcDir = path.join(currentDir, 'src');
        
        if (fs.existsSync(publicTemplatesDir) || 
            fs.existsSync(srcDir) || 
            packageJson.name === 'state-machine-mcp-driver' ||
            packageJson.name?.includes('mcp-driver')) {
          console.log(`📍 Found consumer project root: ${currentDir}`);
          return currentDir;
        }
      } catch (e) {
        // Continue searching if package.json is malformed
      }
    }
    
    currentDir = path.dirname(currentDir);
  }
  
  // Fallback to start directory if no clear project root found
  console.log(`⚠️ Using fallback project root: ${startDir}`);
  return startDir;
}

function copyDirectory(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  const items = fs.readdirSync(source);
  
  for (const item of items) {
    const sourcePath = path.join(source, item);
    const targetPath = path.join(target, item);
    
    const stat = fs.statSync(sourcePath);
    
    if (stat.isDirectory()) {
      copyDirectory(sourcePath, targetPath);
    } else {
      // Special handling for index.html to fix base href
      if (item === 'index.html') {
        let htmlContent = fs.readFileSync(sourcePath, 'utf8');
        
        // Fix base href for serving from subdirectory
        htmlContent = htmlContent.replace(
          '<base href="/">',
          '<base href="./">'
        );
        
        // Make all resource paths relative
        htmlContent = htmlContent.replace(
          /href="([^"]+\.css)"/g,
          'href="./$1"'
        );
        htmlContent = htmlContent.replace(
          /href="([^"]+\.js)"/g,
          'href="./$1"'
        );
        htmlContent = htmlContent.replace(
          /src="([^"]+\.js)"/g,
          'src="./$1"'
        );
        
        fs.writeFileSync(targetPath, htmlContent);
        console.log(`📝 Fixed index.html paths for subdirectory serving`);
      } else {
        fs.copyFileSync(sourcePath, targetPath);
      }
    }
  }
}

function main() {
  console.log('🎮 ThreeJS AlephScript SDK PostInstall Script');
  console.log('=' .repeat(50));
  
  try {
    // 1. Find consumer's project root
    const projectRoot = findProjectRoot();
    console.log(`🎯 Consumer project root: ${projectRoot}`);
    
    // 2. Source: Package's built Angular app
    const sourceWebUIDir = path.join(__dirname, '..', 'dist', 'dev-app', 'browser');
    console.log(`📁 Source ThreeJS UI: ${sourceWebUIDir}`);
    
    // 3. Target: Consumer's public_templates/threejs-ui
    const targetDir = path.join(projectRoot, 'public_templates', 'threejs-ui');
    console.log(`🎯 Target directory: ${targetDir}`);
    
    // 4. Check if source exists
    if (!fs.existsSync(sourceWebUIDir)) {
      console.warn(`⚠️ ThreeJS UI source directory not found: ${sourceWebUIDir}`);
      console.warn('📝 Please run "npm run build" first to build the Angular app');
      console.warn('🔧 Attempting to use existing build or create placeholder...');
      
      // Create a basic placeholder structure
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
        
        const placeholderHtml = `<!DOCTYPE html>
<html>
<head>
    <title>ThreeJS Gamify UI - Setup Required</title>
</head>
<body>
    <h1>🎮 ThreeJS Gamify UI</h1>
    <p>Please build the Angular app first:</p>
    <pre>npm run devapp && npm run build</pre>
</body>
</html>`;
        
        fs.writeFileSync(path.join(targetDir, 'index.html'), placeholderHtml);
        console.log('📄 Created placeholder HTML file');
      }
      
      return;
    }
    
    // 5. Copy Angular build artifacts
    console.log('🚀 Copying ThreeJS Angular UI...');
    copyDirectory(sourceWebUIDir, targetDir);
    
    console.log('✅ ThreeJS AlephScript SDK installed successfully!');
    console.log('📁 ThreeJS Angular UI copied to: public_templates/threejs-ui');
    console.log('🎯 Now you can use type: "threejs-runtime" in MultiUIGameManager');
    console.log('🎮 You can now import and use the ThreeJS UI library components in your Angular application');
    console.log('Example: import { ThreejsUiModule } from "@escrivivir/threejs-ui-lib";');
    
    // 6. Verify installation
    const indexPath = path.join(targetDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      console.log('✅ Installation verified: index.html found');
    } else {
      console.warn('⚠️ Installation may be incomplete: index.html not found');
    }
    
  } catch (error) {
    console.error('❌ PostInstall failed:', error.message);
    console.error('🔍 Full error:', error);
    process.exit(1);
  }
}

// Only run if called directly (not required)
if (require.main === module) {
  main();
}

module.exports = { main, findProjectRoot, copyDirectory };
