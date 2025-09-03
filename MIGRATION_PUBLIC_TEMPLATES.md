# Migración a public_templates

## Cambios realizados

### 1. Script postinstall actualizado
El script `scripts/postinstall.cjs` ahora copia archivos a:
- **Nueva ubicación**: `public_templates/threejs-ui/`
- **Ubicación anterior**: `public/threejs-ui/` ❌

### 2. Configuración de staticDir automática
En `state-machine-mcp-driver/src/ui/MultiUIGameManager.ts`:

```typescript
staticDir: config.config.staticDir || (provideTemplate 
    ? path.resolve(process.cwd(), "public_templates/threejs-ui")
    : "e:/LAB_AGOSTO/threejs-gamify-ui/client"),
```

**Cuando `provideTemplate: true`:**
- Los archivos se sirven desde `public_templates/threejs-ui/`
- El `staticDir` se configura automáticamente a esta ruta

**Cuando `provideTemplate: false`:**
- Usa el modo dinámico tradicional
- `staticDir` apunta al desarrollo local

### 3. Proceso de instalación

1. **Desarrollo local**: 
   ```bash
   cd threejs-gamify-ui
   npm run build
   ```

2. **Como dependencia npm**:
   ```bash
   npm install threejs-gamification-ui
   # El postinstall automáticamente copia a public_templates/
   ```

3. **Configuración del juego**:
   ```typescript
   {
     "type": "threejs",
     "config": {
       "provideTemplate": true,  // ← Activa template mode
       // staticDir se configura automáticamente
     }
   }
   ```

### 4. Verificación

Para verificar que todo funciona:

```bash
# En state-machine-mcp-driver
npm run start
# Navegar a http://localhost:9090
# Verificar que usa archivos de public_templates/threejs-ui/
```

## Beneficios

✅ **Separación clara**: Templates precompilados separados de assets públicos  
✅ **Instalación automática**: El postinstall maneja todo  
✅ **Configuración automática**: No necesitas especificar staticDir manualmente  
✅ **Modo dual**: Funciona tanto en desarrollo como en producción  

## Compatibilidad hacia atrás

- La carpeta `public/` ya no se usa para templates Angular
- Si tienes configuraciones manuales de `staticDir`, seguirán funcionando
- El código detecta automáticamente la ubicación correcta
