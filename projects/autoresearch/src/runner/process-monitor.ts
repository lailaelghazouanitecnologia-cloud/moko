import { EventEmitter } from 'node:events';
import { HealthStatus, HealthCallback } from './index';

export class ProcessMonitor extends EventEmitter {
  private pid: number = 0;
  private cpuUsage: number = 0;
  private memoryUsage: number = 0;
  private isHealthy: boolean = true;
  private checkInterval: number = 1000;
  private interval: NodeJS.Timeout | null = null;
  private healthCallbacks: HealthCallback[] = [];
  private lastCpuTime: number = 0;
  private lastCpuTotal: number = 0;
  private readonly MAX_PID: number = 4194304;
  private readonly MIN_CHECK_INTERVAL: number = 100;

  constructor() {
    super();
    this.setMaxListeners(100);
  }

  /**
   * Attach to a process and start monitoring its health and resource usage
   * @param pid - The process ID to monitor
   * @throws {Error} If pid is invalid or already monitoring
   */
  attach(pid: number): void {
    if (!this.isValidPid(pid)) {
      throw new Error(`Invalid PID: ${pid}. Must be between 1 and ${this.MAX_PID}`);
    }

    if (this.pid !== 0) {
      throw new Error(`Already monitoring PID ${this.pid}. Call detach() first.`);
    }

    this.pid = pid;
    this.startMonitoring();
  }

  /**
   * Detach from the current process and stop monitoring
   */
  detach(): void {
    this.stopMonitoring();
    this.resetState();
  }

  /**
   * Check the current health status of the monitored process
   * @returns {HealthStatus} The current health status
   */
  checkHealth(): HealthStatus {
    if (!this.isAlive()) {
      return HealthStatus.DEAD;
    }

    const usage = this.getResourceUsage();
    
    if (usage.cpuPercent > 90 || usage.memoryPercent > 90) {
      return HealthStatus.CRITICAL;
    }
    
    if (usage.cpuPercent > 70 || usage.memoryPercent > 70) {
      return HealthStatus.DEGRADED;
    }

    return HealthStatus.HEALTHY;
  }

  /**
   * Get current resource usage statistics
   * @returns {ResourceUsage} CPU and memory usage data
   */
  getResourceUsage(): ResourceUsage {
    if (!this.isAlive()) {
      return { cpuPercent: 0, memoryPercent: 0, memoryMB: 0 };
    }

    try {
      const stats = this.readProcStats();
      const totalMem = this.getTotalMemory();
      
      return {
        cpuPercent: Math.max(0, Math.min(100, stats.cpuPercent)),
        memoryPercent: Math.max(0, Math.min(100, (stats.memoryBytes / totalMem) * 100)),
        memoryMB: Math.max(0, stats.memoryBytes / (1024 * 1024))
      };
    } catch (error) {
      this.emit('error', new Error(`Failed to get resource usage: ${error instanceof Error ? error.message : 'Unknown error'}`));
      return { cpuPercent: 0, memoryPercent: 0, memoryMB: 0 };
    }
  }

  /**
   * Check if the monitored process is alive
   * @returns {boolean} True if process exists and is alive
   */
  isAlive(): boolean {
    if (!this.pid || !this.isValidPid(this.pid)) {
      return false;
    }
    
    try {
      process.kill(this.pid, 0);
      return true;
    catch {
      return false;
    }
  }

  /**
   * Send a signal to the monitored process
   * @param signal - The signal to send (e.g., 'SIGTERM', 'SIGINT')
   * @returns {boolean} True if signal was sent successfully
   */
  kill(signal: string): boolean {
    if (!this.isAlive()) {
      return false;
    }
    
    try {
      process.kill(this.pid, signal as NodeJS.Signals);
      return true;
    } catch (error) {
      this.emit('error', new Error(`Failed to kill process ${this.pid} with signal ${signal}: ${error instanceof Error ? error.message : 'Unknown error'}`));
      return false;
    }
  }

  /**
   * Forcefully kill the process using SIGKILL
   * @returns {boolean} True if process was killed
   */
  forceKill(): boolean {
    return this.kill('SIGKILL');
  }

  /**
   * Register a callback for health status changes
   * @param callback - Function to call when health status changes
   */
  onHealthChange(callback: HealthCallback): void {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
    this.healthCallbacks.push(callback);
  }

  /**
   * Set the interval for health checks
   * @param {number} interval - Check interval in milliseconds
   * @throws {Error} If interval is less than minimum allowed
   */
  setCheckInterval(interval: number): void {
    if (interval < this.MIN_CHECK_INTERVAL) {
      throw new Error(`Check interval must be at least ${this.MIN_CHECK_INTERVAL}ms`);
    }
    
    this.checkInterval = interval;
    
    // Restart monitoring with new interval if currently active
    if (this.pid !== 0 && this.interval) {
      this.stopMonitoring();
      this.startMonitoring();
    }
  }

  /**
   * Get the current check interval
   * @returns {number} Current check interval in milliseconds
   */
  getCheckInterval(): number {
    return this.checkInterval;
  }

  /**
   * Get the current PID being monitored
   * @returns {number} Current PID or 0 if not monitoring
   */
  getPid(): number {
    return this.pid;
  }

  /**
   * Check if currently monitoring a process
   * @returns {boolean} True if monitoring a process
   */
  isMonitoring(): boolean {
    return this.pid !== 0 && this.interval !== null;
  }

  private startMonitoring(): void {
    if (this.interval) {
      return; // Already monitoring
    }

    this.interval = setInterval(() => {
      try {
        const newHealth = this.checkHealth();
        const oldHealth = this.isHealthy;
        
        this.isHealthy = newHealth === HealthStatus.HEALTHY;
        
        if (newHealth !== oldHealth) {
          this.emit('healthChange', newHealth);
          this.healthCallbacks.forEach((cb, index) => {
            try {
              cb(newHealth);
            } catch (error) {
              this.emit('error', new Error(`Health callback ${index} failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
            }
          });
        }
      } catch (error) {
        this.emit('error', new Error(`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    }, this.checkInterval);

    // Don't prevent process from exiting
    this.interval.unref();
  }

  private stopMonitoring(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private readProcStats(): { cpuPercent: number; memoryBytes: number } {
    if (!this.isAlive()) {
      return { cpuPercent: 0, memoryBytes: 0 };
    }

    let cpuPercent = 0;
    let memoryBytes = 0;

    try {
      const fs = require('fs');
      const statContent = fs.readFileSync(`/proc/${this.pid}/stat`, 'utf8');
      const statParts = statContent.split(' ');
      
      const utime = parseInt(statParts[13], 10);
      const stime = parseInt(statParts[14], 10);
      const starttime = parseInt(statParts[21], 10);
      const totalTime = utime + stime;
      
      const uptimeContent = fs.readFileSync('/proc/uptime', 'utf8');
      const uptime = parseFloat(uptimeContent.split(' ')[0]);
      
      const clockTicks = parseInt(require('os').conf().CLK_TCK || 100, 10);
      const totalCpuTime = totalTime / clockTicks;
      const totalCpuTimeSinceBoot = uptime - (starttime / clockTicks);
      
      if (this.lastCpuTime !== 0 && this.lastCpuTotal !== 0) {
        const cpuTimeDiff = totalCpuTime - this.lastCpuTime;
        const totalTimeDiff = totalCpuTimeSinceBoot - this.lastCpuTotal;
        
        if (totalTimeDiff > 0) {
          cpuPercent = (cpuTimeDiff / totalTimeDiff) * 100;
        }
      }
      
      this.lastCpuTime = totalCpuTime;
      this.lastCpuTotal = totalCpuTimeSinceBoot;

      // Read memory usage
      const statusContent = fs.readFileSync(`/proc/${this.pid}/status`, 'utf8');
      const lines = statusContent.split('\n');
      for (const line of lines) {
        if (line.startsWith('VmRSS:')) {
          const parts = line.trim().split(/\s+/);
          memoryBytes = parseInt(parts[1], 10) * 1024; // Convert KB to bytes
          break;
        }
      }
    } catch (error) {
      this.emit('error', new Error(`Failed to read process stats: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }

    return { cpuPercent, memoryBytes };
  }

  private getTotalMemory(): number {
    try {
      return require('os').totalmem();
    } catch {
      return 1024 * 1024 * 1024; // 1GB fallback
    }
  }

  private isValidPid(pid: number): boolean {
    return Number.isInteger(pid) && pid > 0 && pid <= this.MAX_PID;
  }

  private resetState(): void {
    this.pid = 0;
    this.cpuUsage = 0;
    this.memoryUsage = 0;
    this.isHealthy = true;
    this.lastCpuTime = 0;
    this.lastCpuTotal = 0;
    this.healthCallbacks = [];
  }

  /**
   * Clean up resources and stop monitoring
   */
  destroy(): void {
    this.detach();
    this.removeAllListeners();
  }
}

interface ResourceUsage {
  cpuPercent: number;
  memoryPercent: number;
  memoryMB: number;
}
