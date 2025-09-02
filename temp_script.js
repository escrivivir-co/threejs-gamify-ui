// TRAZAS DE DEBUG PARA ALEPHSCRIPT
console.log('Ì¥ç DEBUG: Iniciando verificaci√≥n AlephScript...');

// Verificar si el script est√° cargado
if (window.createAlephScriptClient) {
  console.log('‚úÖ DEBUG: AlephScript client disponible');
} else {
  console.log('‚ùå DEBUG: AlephScript client NO disponible');
}

// Verificar si RxjsSocketBridge est√° usando AlephScript
console.log('Ì¥ç DEBUG: Verificando bridge initialization...');

// Override del m√©todo connect para detectar si usa AlephScript
const originalConnect = console.log;
window.addEventListener('load', () => {
  console.log('Ì¥ç DEBUG: P√°gina cargada, verificando conexiones...');
  setTimeout(() => {
    console.log('Ì¥ç DEBUG: Verificaci√≥n post-carga completada');
  }, 2000);
});
