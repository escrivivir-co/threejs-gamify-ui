// ThreeGamificationUI - Simplified Bootstrap
// This file initializes the 3D scene and UI components manually

import * as THREE from 'three';
import { io } from 'socket.io-client';

class ThreeGamificationUI {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.socket = null;
    this.botPositions = [];
    this.bots = new Map();
    this.animationId = null;

    // Bot configuration - 8 bots on cardinal spirals
    this.BOT_CONFIG = [
      { id: 'bot-n1', name: 'North 1', position: { x: 0, y: 2, z: 8 }, cardinal: 'North' },
      { id: 'bot-n2', name: 'North 2', position: { x: 0, y: 4, z: 12 }, cardinal: 'North' },
      { id: 'bot-s1', name: 'South 1', position: { x: 0, y: 2, z: -8 }, cardinal: 'South' },
      { id: 'bot-s2', name: 'South 2', position: { x: 0, y: 4, z: -12 }, cardinal: 'South' },
      { id: 'bot-e1', name: 'East 1', position: { x: 8, y: 2, z: 0 }, cardinal: 'East' },
      { id: 'bot-e2', name: 'East 2', position: { x: 12, y: 4, z: 0 }, cardinal: 'East' },
      { id: 'bot-w1', name: 'West 1', position: { x: -8, y: 2, z: 0 }, cardinal: 'West' },
      { id: 'bot-w2', name: 'West 2', position: { x: -12, y: 4, z: 0 }, cardinal: 'West' }
    ];
  }

  async init() {
    console.log('Initializing ThreeGamificationUI...');
    
    // Initialize Three.js scene
    this.initThreeScene();
    
    // Initialize Socket.io connection
    this.initSocket();
    
    // Initialize UI components
    this.initUI();
    
    // Start render loop
    this.animate();
    
    console.log('ThreeGamificationUI initialized successfully!');
  }

  initThreeScene() {
    const canvas = document.getElementById('three-canvas');
    const container = canvas.parentElement;

    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111827);

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(
      75, 
      container.clientWidth / container.clientHeight, 
      0.1, 
      1000
    );
    this.camera.position.set(15, 15, 15);
    this.camera.lookAt(0, 0, 0);

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);

    // Create central Socket.io hub
    this.createCentralHub();
    
    // Create bot positions
    this.createBotPositions();

    // Handle window resize
    window.addEventListener('resize', () => {
      this.camera.aspect = container.clientWidth / container.clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(container.clientWidth, container.clientHeight);
    });
  }

  createCentralHub() {
    // Central hub geometry
    const hubGeometry = new THREE.SphereGeometry(1, 16, 16);
    const hubMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x00ff88,
      transparent: true,
      opacity: 0.8
    });
    const hub = new THREE.Mesh(hubGeometry, hubMaterial);
    hub.position.set(0, 0, 0);
    this.scene.add(hub);

    // Hub pulsing animation
    const originalScale = hub.scale.x;
    const animate = () => {
      const time = Date.now() * 0.002;
      const scale = originalScale + Math.sin(time) * 0.1;
      hub.scale.setScalar(scale);
    };
    this.hubAnimation = animate;
  }

  createBotPositions() {
    this.BOT_CONFIG.forEach(botConfig => {
      // Bot mesh
      const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
      const material = new THREE.MeshPhongMaterial({ 
        color: this.getBotColor(botConfig.cardinal),
        transparent: true,
        opacity: 0.7
      });
      const botMesh = new THREE.Mesh(geometry, material);
      botMesh.position.copy(botConfig.position);
      botMesh.userData = { botId: botConfig.id, originalPosition: { ...botConfig.position } };
      
      this.scene.add(botMesh);
      this.botPositions.push(botMesh);

      // Connection line to hub
      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(botConfig.position.x, botConfig.position.y, botConfig.position.z)
      ]);
      const lineMaterial = new THREE.LineBasicMaterial({ 
        color: this.getBotColor(botConfig.cardinal),
        opacity: 0.3,
        transparent: true
      });
      const line = new THREE.Line(lineGeometry, lineMaterial);
      this.scene.add(line);

      // Initialize bot state
      this.bots.set(botConfig.id, {
        ...botConfig,
        status: 'inactive',
        mesh: botMesh,
        line: line
      });
    });
  }

  getBotColor(cardinal) {
    const colors = {
      'North': 0xff4444,
      'South': 0x44ff44,
      'East': 0x4444ff,
      'West': 0xffff44
    };
    return colors[cardinal] || 0xffffff;
  }

  initSocket() {
    this.socket = io('/', {
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
      this.addMessage('Socket.io connection established', 'sys');
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
      this.addMessage('Socket.io connection lost', 'sys');
    });

    this.socket.on('bot:status', (data) => {
      this.updateBotStatus(data.botId, data.status);
      this.addMessage(`Bot ${data.botId}: ${data.status}`, 'app');
    });

    this.socket.on('message', (data) => {
      this.addMessage(`${data.botId}: ${data.message}`, data.channel || 'app');
      this.animateMessageParticle(data.botId);
    });
  }

  initUI() {
    // Populate bot list
    this.updateBotList();
    
    // Add control event listeners
    this.setupBotControls();
  }

  updateBotList() {
    const botListElement = document.getElementById('bot-list');
    botListElement.innerHTML = '';

    this.bots.forEach((bot, botId) => {
      const botItem = document.createElement('div');
      botItem.className = 'bot-item';
      botItem.innerHTML = `
        <span>${bot.name} (${bot.cardinal})</span>
        <span class="status-${bot.status}">${bot.status.toUpperCase()}</span>
        <button class="${bot.status === 'active' ? 'stop-btn' : 'start-btn'} control-button" 
                data-bot-id="${botId}" 
                data-action="${bot.status === 'active' ? 'stop' : 'start'}">
          ${bot.status === 'active' ? 'Stop' : 'Start'}
        </button>
      `;
      botListElement.appendChild(botItem);
    });
  }

  setupBotControls() {
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('control-button')) {
        const botId = e.target.dataset.botId;
        const action = e.target.dataset.action;
        this.controlBot(botId, action);
      }
    });
  }

  controlBot(botId, action) {
    const newStatus = action === 'start' ? 'active' : 'inactive';
    
    // Emit to server
    this.socket.emit('bot:control', { botId, action, status: newStatus });
    
    // Update local state
    this.updateBotStatus(botId, newStatus);
    this.addMessage(`Bot ${botId} ${action} command sent`, 'ui');
  }

  updateBotStatus(botId, status) {
    const bot = this.bots.get(botId);
    if (bot) {
      bot.status = status;
      
      // Update 3D visualization
      if (bot.mesh) {
        bot.mesh.material.opacity = status === 'active' ? 1.0 : 0.5;
        bot.line.material.opacity = status === 'active' ? 0.6 : 0.2;
      }
      
      // Update UI
      this.updateBotList();
    }
  }

  addMessage(message, channel = 'app') {
    const messageLog = document.getElementById('message-log');
    const messageItem = document.createElement('div');
    messageItem.className = `message-item message-${channel}`;
    
    const timestamp = new Date().toLocaleTimeString();
    messageItem.textContent = `[${timestamp}] ${message}`;
    
    messageLog.appendChild(messageItem);
    messageLog.scrollTop = messageLog.scrollHeight;
    
    // Keep only last 50 messages
    while (messageLog.children.length > 50) {
      messageLog.removeChild(messageLog.firstChild);
    }
  }

  animateMessageParticle(botId) {
    const bot = this.bots.get(botId);
    if (!bot || !bot.mesh) return;

    // Create particle
    const particleGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const particleMaterial = new THREE.MeshBasicMaterial({ 
      color: this.getBotColor(bot.cardinal),
      transparent: true,
      opacity: 0.8
    });
    const particle = new THREE.Mesh(particleGeometry, particleMaterial);
    
    // Start at bot position
    particle.position.copy(bot.mesh.position);
    this.scene.add(particle);

    // Animate to center
    const startPos = bot.mesh.position.clone();
    const endPos = new THREE.Vector3(0, 0, 0);
    let progress = 0;

    const animateParticle = () => {
      progress += 0.05;
      
      if (progress >= 1) {
        this.scene.remove(particle);
        return;
      }

      // Lerp position with slight curve
      particle.position.lerpVectors(startPos, endPos, progress);
      particle.position.y += Math.sin(progress * Math.PI) * 2;
      
      requestAnimationFrame(animateParticle);
    };

    animateParticle();
  }

  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());

    // Update hub animation
    if (this.hubAnimation) {
      this.hubAnimation();
    }

    // Update bot bobbing animation
    const time = Date.now() * 0.001;
    this.botPositions.forEach((bot, index) => {
      if (bot.userData.originalPosition) {
        const bobOffset = Math.sin(time + index * 0.5) * 0.2;
        bot.position.y = bot.userData.originalPosition.y + bobOffset;
      }
    });

    // Render
    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

// Initialize the application
const app = new ThreeGamificationUI();
app.init().catch(console.error);

// Export for global access
window.ThreeGamificationUI = app;

export default app;