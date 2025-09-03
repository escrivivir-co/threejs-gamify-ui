# ThreeGamificationUI

A real-time 3D bot architecture visualization system built with Angular and Three.js featuring reactive data flows and gamification elements.

## Project Overview

ThreeGamificationUI is an interactive 3D visualization platform that displays bot networks in real-time using Angular, Three.js, and Socket.io. The system features:

- **3D Visualization**: Interactive Three.js scene with central Socket.io hub and 8 bot positions on cardinal spirals
- **Real-time Communication**: RxJS-Socket.io bridge for reactive data flow
- **Bot Management**: Interactive UI for controlling bot states and operations
- **Message Streaming**: Real-time message panel with channel filtering
- **Performance Monitoring**: Live FPS monitoring and system health metrics

## Architecture



-   Qué ganas

    -   Menos overhead y UI más predecible: no hay parches de Zone.js, menos disparos "mágicos" de CD.
    -   Mejor rendimiento en eventos de alta frecuencia (animaciones, WebGL, sockets).
    -   Debug más limpio (call stacks sin Zone.js).
-   Qué asumes

    -   No hay detección automática tras promesas, timeouts o eventos globales. Debes:
        -   Modelar estado con Signals (preferente): `signal`, `computed`, `effect` actualizan la vista sin zones.
        -   Para RxJS, convertir a signal (`toSignal`) o actualizar señales/estado dentro de `effect`.
        -   Eventos externos (WebSocket, setTimeout, APIs de terceros): marcar cambios manualmente (`ChangeDetectorRef.markForCheck()`/actualizar señales) o envolver en contexto Angular.
    -   Algunas librerías que dependen de Zone.js (tests legacy, componentes antiguos) pueden no refrescar la UI automáticamente.
    -   Tests: no usar `fakeAsync`/Zone; preferir pruebas basadas en signals/async nativo.
-   Recomendado si

    -   Usas Signals para el estado y controlas dónde se actualiza la UI.
    -   Tu app tiene render/inputs muy frecuentes (Three.js, canvas, mapas, websockets).
    -   Puedes revisar puntos donde hoy dependes de "auto-CD" de Zone.js.
-   No recomendado si

    -   Dependéis de muchas libs que esperan Zone.js.
    -   Aún no migráis a Signals y rely en CD implícita de Zone.
-   Cambios mínimos para activarlo

    -   Quitar `import 'zone.js'` en [main.ts](vscode-file://vscode-app/c:/Program%20Files/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html).
    -   Añadir el proveedor zoneless en [app.config.ts](vscode-file://vscode-app/c:/Program%20Files/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html) (Angular 20): `provideZonelessChangeDetection()` en [providers](vscode-file://vscode-app/c:/Program%20Files/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html).
    -   Revisar puntos "asíncronos" y moverlos a Signals/efectos o marcar cambios explícitamente.

Si quieres, lo configuro y reviso rápidamente los sitios sensibles (RxJS, sockets, timers) para que la UI siga reaccionando sin Zone.js.