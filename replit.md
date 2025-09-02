# ThreeGamificationUI - Real-time 3D Bot Visualization Platform

## Overview

ThreeGamificationUI is an interactive 3D visualization platform that displays bot networks in real-time using Angular, Three.js, and Socket.io. The system features a central Socket.io hub with 8 bot positions arranged on cardinal spirals, providing real-time communication through RxJS-Socket.io bridge, interactive UI for controlling bot states, message streaming with channel filtering, and live performance monitoring.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: Angular (latest) with standalone components
- **3D Rendering**: Three.js for WebGL-based 3D visualization
- **Reactive Programming**: RxJS for data flow management and reactive streams
- **UI Components**: Custom Angular components with CSS styling and animations
- **Development Tools**: Angular CLI, TypeScript, Karma/Jasmine for testing

### Backend Architecture
- **Server Framework**: Express.js with TypeScript
- **Real-time Communication**: Socket.io server for WebSocket connections
- **Build System**: Vite for development and production builds
- **Module System**: ES modules with modern JavaScript features

### Data Flow and Communication
- **RxJS-Socket.io Bridge**: Custom bridge connecting Socket.io events to RxJS Observables
- **Channel-based Messaging**: Three distinct channels (Sys, App, UI) for message categorization
- **Room Management**: Socket.io rooms for organizing bot connections
- **Reactive Pipeline**: Observable streams for real-time data transformation and filtering

### 3D Scene Architecture
- **Scene Layout**: Central sphere representing Socket.io hub with 8 bot positions on cardinal spirals (North, South, East, West - 2 positions each)
- **Animation System**: Curved trajectories for message visualization using THREE.Curve
- **Performance Optimization**: Instanced rendering, object pooling, and LOD management
- **Camera Controls**: Orbital navigation with zoom and rotation controls

### Component Structure
- **Core Services**: Bridge, Socket service, Three.js scene management
- **Feature Modules**: Bot management, message panel, demo client
- **Shared Utilities**: Three.js helpers, models, interfaces
- **Demo System**: External client for testing and demonstration scenarios

### State Management
- **Reactive State**: BehaviorSubjects and Observables for component state
- **Centralized Services**: Angular services as state managers
- **Real-time Updates**: Automatic UI updates through reactive data binding

## External Dependencies

### Core Dependencies
- **Angular Framework**: @angular/core, @angular/common, @angular/platform-browser
- **Three.js**: 3D graphics library for WebGL rendering
- **Socket.io**: Real-time WebSocket communication (client and server)
- **RxJS**: Reactive extensions for asynchronous programming

### Development Dependencies
- **Build Tools**: Angular CLI, Vite, TypeScript compiler
- **Testing**: Karma, Jasmine, Cypress (planned for e2e)
- **Development Server**: Express.js with middleware support

### UI and Styling
- **React Three.js**: @react-three/fiber, @react-three/drei, @react-three/postprocessing
- **UI Components**: Radix UI components for React integration
- **Styling**: Tailwind CSS, PostCSS, custom CSS animations
- **Fonts**: Inter font family via Fontsource

### Database and Storage
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Database Driver**: Neon Database serverless PostgreSQL
- **Schema Management**: Drizzle Kit for migrations and schema management

### Utility Libraries
- **Data Query**: TanStack React Query for data fetching
- **Validation**: Zod for runtime type validation
- **Utilities**: clsx, class-variance-authority for styling utilities
- **State Management**: Zustand (referenced in React components)

### Audio and Media
- **Audio Support**: Vite configuration includes audio file support (.mp3, .ogg, .wav)
- **3D Assets**: Support for GLTF/GLB model files
- **Performance**: GLSL shader support via vite-plugin-glsl