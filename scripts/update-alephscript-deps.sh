#!/bin/bash

# Script para actualizar las dependencias AlephScript desde el workspace principal
# Ejecutar desde threejs-gamify-ui/ cuando hay nuevas versiones de las librerías

echo "🔄 Actualizando dependencias AlephScript..."
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ] || [ ! -d "projects/threejs-ui-lib" ]; then
    echo "❌ ERROR: Ejecuta este script desde el directorio threejs-gamify-ui/"
    exit 1
fi

# Verificar que el workspace existe
if [ ! -d "../socket-gym/ws-server/packages" ]; then
    echo "❌ ERROR: No se encuentra el workspace socket-gym/ws-server/packages/"
    exit 1
fi

echo "1. 🧹 Limpiando instalación anterior..."
rm -rf node_modules package-lock.json
echo "   ✓ node_modules y package-lock.json eliminados"
echo ""

echo "2. 📦 Verificando que los paquetes .tgz existen..."
CORE_BROWSER_PKG="../socket-gym/ws-server/packages/aleph-script-core-browser/alephscript-core-browser-1.0.0.tgz"
ANGULAR_PKG="../socket-gym/ws-server/packages/aleph-script-angular/alephscript-angular-1.0.0.tgz"

if [ ! -f "$CORE_BROWSER_PKG" ]; then
    echo "   ❌ ERROR: $CORE_BROWSER_PKG no encontrado"
    echo "   💡 Ejecuta: cd ../socket-gym/ws-server/packages/aleph-script-core-browser && npm run build && npm pack"
    exit 1
fi

if [ ! -f "$ANGULAR_PKG" ]; then
    echo "   ❌ ERROR: $ANGULAR_PKG no encontrado"
    echo "   💡 Ejecuta: cd ../socket-gym/ws-server/packages/aleph-script-angular && npm run build && npm pack"
    exit 1
fi

echo "   ✓ Ambos paquetes .tgz encontrados"
echo ""

echo "3. 📥 Instalando dependencias..."
if npm install; then
    echo "   ✓ Instalación completada"
else
    echo "   ❌ ERROR: La instalación falló"
    exit 1
fi
echo ""

echo "4. 🔨 Compilando librería..."
if npm run build > /dev/null 2>&1; then
    echo "   ✓ Compilación exitosa"
else
    echo "   ❌ ERROR: La compilación falló"
    exit 1
fi
echo ""

echo "🎉 ACTUALIZACIÓN COMPLETADA!"
echo ""
echo "📋 Las dependencias AlephScript han sido actualizadas desde:"
echo "   • $CORE_BROWSER_PKG"
echo "   • $ANGULAR_PKG"
echo ""
echo "🚀 Ahora puedes:"
echo "   npm run devapp          # Ejecutar aplicación de desarrollo"
echo "   npm run build:package   # Generar paquete actualizado"
echo ""
