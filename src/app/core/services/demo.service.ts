import { Injectable } from '@angular/core';
import { BehaviorSubject, interval, Subscription } from 'rxjs';
import { DemoClient, DemoConfig } from '../../demo/demo-client';

export interface DemoScenario {
  id: string;
  name: string;
  description: string;
  duration: number;
  messageTypes: string[];
}

export interface DemoStatus {
  isRunning: boolean;
  isConnected: boolean;
  currentScenario: string | null;
  messageCount: number;
  duration: number;
  startTime: Date | null;
}

@Injectable({
  providedIn: 'root'
})
export class DemoService {
  private demoClient: DemoClient | null = null;
  private statusSubject = new BehaviorSubject<DemoStatus>({
    isRunning: false,
    isConnected: false,
    currentScenario: null,
    messageCount: 0,
    duration: 0,
    startTime: null
  });

  private updateSubscription: Subscription | null = null;

  // Available demo scenarios
  private scenarios: DemoScenario[] = [
    {
      id: 'basic',
      name: 'Basic Communication',
      description: 'Simple bot status updates and health checks',
      duration: 60,
      messageTypes: ['bot_status', 'health_check']
    },
    {
      id: 'interactive',
      name: 'Interactive Demo',
      description: 'Simulated user interactions and responses',
      duration: 120,
      messageTypes: ['bot_status', 'user_actions', 'bot_commands']
    },
    {
      id: 'stress_test',
      name: 'Performance Test',
      description: 'High-frequency messages for performance testing',
      duration: 30,
      messageTypes: ['bot_status', 'health_check', 'system_events', 'user_actions']
    },
    {
      id: 'showcase',
      name: 'Full Showcase',
      description: 'Complete demonstration of all features',
      duration: 180,
      messageTypes: ['bot_status', 'health_check', 'user_actions', 'bot_commands', 'system_events']
    }
  ];

  constructor() {
    console.log('DemoService initialized');
  }

  /**
   * Get available demo scenarios
   */
  getScenarios(): DemoScenario[] {
    return [...this.scenarios];
  }

  /**
   * Get current demo status
   */
  getStatus() {
    return this.statusSubject.asObservable();
  }

  /**
   * Start demo with specified scenario
   */
  async startDemo(scenarioId: string = 'basic', serverUrl: string = 'http://localhost:8000'): Promise<boolean> {
    try {
      console.log(`Starting demo scenario: ${scenarioId}`);
      
      const scenario = this.scenarios.find(s => s.id === scenarioId);
      if (!scenario) {
        console.error('Invalid scenario ID:', scenarioId);
        return false;
      }

      // Stop existing demo if running
      if (this.demoClient) {
        await this.stopDemo();
      }

      // Create demo configuration
      const config: DemoConfig = {
        serverUrl,
        scenarios: scenario.messageTypes,
        messageInterval: this.getMessageInterval(scenarioId),
        duration: scenario.duration
      };

      // Create and connect demo client
      this.demoClient = new DemoClient(config);
      const connected = await this.demoClient.connect();
      
      if (!connected) {
        console.error('Failed to connect demo client');
        this.updateStatus({ isConnected: false });
        return false;
      }

      // Start the demo
      this.demoClient.start();

      // Update status
      this.updateStatus({
        isRunning: true,
        isConnected: true,
        currentScenario: scenarioId,
        messageCount: 0,
        duration: scenario.duration,
        startTime: new Date()
      });

      // Start status monitoring
      this.startStatusMonitoring();

      // Auto-stop after duration
      setTimeout(() => {
        if (this.statusSubject.value.currentScenario === scenarioId) {
          this.stopDemo();
        }
      }, scenario.duration * 1000);

      console.log(`Demo started successfully: ${scenario.name}`);
      return true;

    } catch (error) {
      console.error('Error starting demo:', error);
      this.updateStatus({ 
        isRunning: false, 
        isConnected: false,
        currentScenario: null 
      });
      return false;
    }
  }

  /**
   * Stop the current demo
   */
  async stopDemo(): Promise<void> {
    console.log('Stopping demo...');

    // Stop status monitoring
    if (this.updateSubscription) {
      this.updateSubscription.unsubscribe();
      this.updateSubscription = null;
    }

    // Stop and disconnect demo client
    if (this.demoClient) {
      this.demoClient.stop();
      this.demoClient.disconnect();
      this.demoClient = null;
    }

    // Update status
    this.updateStatus({
      isRunning: false,
      isConnected: false,
      currentScenario: null,
      startTime: null
    });

    console.log('Demo stopped');
  }

  /**
   * Check if demo is currently running
   */
  isRunning(): boolean {
    return this.statusSubject.value.isRunning;
  }

  /**
   * Check if demo client is connected
   */
  isConnected(): boolean {
    return this.statusSubject.value.isConnected;
  }

  /**
   * Get current message count
   */
  getMessageCount(): number {
    return this.demoClient?.getMessageCount() || 0;
  }

  /**
   * Get demo runtime
   */
  getRuntime(): number {
    const status = this.statusSubject.value;
    if (!status.startTime) return 0;
    
    return Math.floor((Date.now() - status.startTime.getTime()) / 1000);
  }

  /**
   * Start monitoring demo status
   */
  private startStatusMonitoring(): void {
    // Update status every second
    this.updateSubscription = interval(1000).subscribe(() => {
      if (this.demoClient) {
        this.updateStatus({
          messageCount: this.demoClient.getMessageCount(),
          isConnected: this.demoClient.isConnected(),
          isRunning: this.demoClient.isActive()
        });
      }
    });
  }

  /**
   * Get message interval based on scenario
   */
  private getMessageInterval(scenarioId: string): number {
    switch (scenarioId) {
      case 'basic':
        return 2000; // 2 seconds
      case 'interactive':
        return 1500; // 1.5 seconds
      case 'stress_test':
        return 200;  // 0.2 seconds
      case 'showcase':
        return 1000; // 1 second
      default:
        return 1000;
    }
  }

  /**
   * Update status subject
   */
  private updateStatus(updates: Partial<DemoStatus>): void {
    const currentStatus = this.statusSubject.value;
    this.statusSubject.next({ ...currentStatus, ...updates });
  }

  /**
   * Get demo statistics
   */
  getStatistics() {
    const status = this.statusSubject.value;
    const runtime = this.getRuntime();
    
    return {
      ...status,
      runtime,
      messagesPerSecond: runtime > 0 ? (status.messageCount / runtime).toFixed(2) : '0',
      efficiency: this.calculateEfficiency()
    };
  }

  /**
   * Calculate demo efficiency metric
   */
  private calculateEfficiency(): number {
    const status = this.statusSubject.value;
    const runtime = this.getRuntime();
    
    if (runtime === 0 || status.duration === 0) return 0;
    
    const expectedMessages = runtime * this.getExpectedMessageRate(status.currentScenario);
    const actualMessages = status.messageCount;
    
    return Math.min(100, (actualMessages / expectedMessages) * 100);
  }

  /**
   * Get expected message rate for scenario
   */
  private getExpectedMessageRate(scenarioId: string | null): number {
    if (!scenarioId) return 0;
    
    const interval = this.getMessageInterval(scenarioId);
    return 1000 / interval; // Messages per second
  }

  /**
   * Restart current demo
   */
  async restartDemo(): Promise<boolean> {
    const currentScenario = this.statusSubject.value.currentScenario;
    if (!currentScenario) {
      console.warn('No active demo to restart');
      return false;
    }

    await this.stopDemo();
    return this.startDemo(currentScenario);
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    console.log('Disposing DemoService');
    
    this.stopDemo();
    this.statusSubject.complete();
  }
}
