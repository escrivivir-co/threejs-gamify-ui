#!/bin/bash

# Verificación de migración de AlephScript
# Este script verifica que la migración de las librerías AlephScript funciona correctamente

echo "🔍 Verificando migración de AlephScript..."
echo ""

# Verificar que las rutas de dependencias son correctas
echo "1. ✅ Verificando rutas de dependencias en package.json:"
grep -E "@alephscript/(angular|core-browser)" package.json | head -2
echo ""

# Verificar que las librerías están en la nueva ubicación
echo "2. ✅ Verificando que las librerías están en socket-gym/ws-server/packages/:"
if [ -d "../socket-gym/ws-server/packages/aleph-script-core-browser" ] && [ -d "../socket-gym/ws-server/packages/aleph-script-angular" ]; then
    echo "   ✓ aleph-script-core-browser: EXISTE"
    echo "   ✓ aleph-script-angular: EXISTE"
else
    echo "   ❌ ERROR: Las librerías no están en la ubicación esperada"
    exit 1
fi
echo ""

# Verificar que los paquetes .tgz existen
echo "3. ✅ Verificando que los paquetes .tgz están disponibles:"
if [ -f "../socket-gym/ws-server/packages/aleph-script-core-browser/alephscript-core-browser-1.0.0.tgz" ]; then
    echo "   ✓ core-browser .tgz: EXISTE"
else
    echo "   ❌ ERROR: core-browser .tgz no encontrado"
    exit 1
fi

if [ -f "../socket-gym/ws-server/packages/aleph-script-angular/alephscript-angular-1.0.0.tgz" ]; then
    echo "   ✓ angular .tgz: EXISTE"
else
    echo "   ❌ ERROR: angular .tgz no encontrado"
    exit 1
fi
echo ""

# Verificar que la compilación funciona
echo "4. ✅ Verificando compilación de la librería threejs-ui-lib:"
if npm run build > /dev/null 2>&1; then
    echo "   ✓ Compilación: EXITOSA"
else
    echo "   ❌ ERROR: La compilación falló"
    exit 1
fi
echo ""

# Verificar que las dependencias están instaladas
echo "5. ✅ Verificando que las dependencias AlephScript están instaladas:"
if [ -d "node_modules/@alephscript/core-browser" ] && [ -d "node_modules/@alephscript/angular" ]; then
    echo "   ✓ @alephscript/core-browser: INSTALADO"
    echo "   ✓ @alephscript/angular: INSTALADO"
else
    echo "   ❌ ERROR: Las dependencias AlephScript no están instaladas"
    exit 1
fi
echo ""

echo "🎉 MIGRACIÓN VERIFICADA EXITOSAMENTE!"
echo ""
echo "📋 Resumen:"
echo "   • Las librerías AlephScript están en socket-gym/ws-server/packages/"
echo "   • Las rutas de dependencias están actualizadas"
echo "   • Los paquetes .tgz están disponibles"
echo "   • La compilación funciona correctamente"
echo "   • Las dependencias están instaladas"
echo ""
echo "🚀 Comandos disponibles desde socket-gym/ws-server/:"
echo "   npm run build:core-browser    # Compilar @alephscript/core-browser"
echo "   npm run build:angular         # Compilar @alephscript/angular"
echo "   npm run pack:core-browser     # Generar .tgz de core-browser"
echo "   npm run pack:angular          # Generar .tgz de angular"
echo ""
