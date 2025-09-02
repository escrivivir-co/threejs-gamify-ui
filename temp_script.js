// TRAZAS DE DEBUG PARA ALEPHSCRIPT
console.log('� DEBUG: Iniciando verificación AlephScript...');

// Verificar si el script está cargado
if (window.createAlephScriptClient) {
  console.log('✅ DEBUG: AlephScript client disponible');
} else {
  console.log('❌ DEBUG: AlephScript client NO disponible');
}

// Verificar si RxjsSocketBridge está usando AlephScript
console.log('� DEBUG: Verificando bridge initialization...');

// Override del método connect para detectar si usa AlephScript
const originalConnect = console.log;
window.addEventListener('load', () => {
  console.log('� DEBUG: Página cargada, verificando conexiones...');
  setTimeout(() => {
    console.log('� DEBUG: Verificación post-carga completada');
  }, 2000);
});
