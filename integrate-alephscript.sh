#!/bin/bash
echo "��� Integrating AlephScript into ThreeJS UI..."

# 1. Ensure assets directory exists
mkdir -p dist/public/assets

# 2. Copy AlephScript client
cp /e/LAB_AGOSTO/state-machine-mcp-driver/public/alephscript-client.js dist/public/assets/

# 3. Create version banner
cat > dist/public/version-banner.js << 'BANNER'
console.log(`
%c╔═══════════════════════════════════════════════════════════╗
║  ��� ThreeJS UI - AlephScript Integration v1.0             ║
║  ��� Custom Socket.IO → AlephScript Migration              ║
║  ��� Orchestrator Integration: Active                      ║
║  ��� Port: 9090 (AlephScript-enabled)                      ║
║  ��� Build: $(date)                                        ║
╚═══════════════════════════════════════════════════════════╝
`, 'color: #00ff00; font-weight: bold; font-family: monospace');

console.log('%c��� Starting AlephScript-enabled ThreeJS UI...', 'color: #0099ff; font-weight: bold; font-size: 16px');

window.THREEJS_UI_VERSION = {
  version: '1.0.0',
  integration: 'AlephScript',
  buildDate: new Date().toISOString()
};
BANNER

# 4. Inject scripts into HTML
cp dist/public/index.html dist/public/index.html.backup
sed -i 's|</head>|    <script src="/version-banner.js"></script>\n    <script src="/assets/alephscript-client.js"></script>\n  </head>|' dist/public/index.html

echo "✅ AlephScript integration complete!"
echo "��� Files created:"
echo "   - dist/public/assets/alephscript-client.js"
echo "   - dist/public/version-banner.js"
echo "   - dist/public/index.html (modified)"
