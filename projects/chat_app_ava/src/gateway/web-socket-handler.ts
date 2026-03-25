import { WebSocket } from 'ws';

export class WebSocketHandler {
  private readonly clients: Map<string, WebSocket>;
  private heartbeatInterval: number;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(heartbeatInterval: number = 30000) {
    if (!Number.isInteger(heartbeatInterval) || heartbeatInterval <= 0) {
      throw new RangeError('heartbeatInterval must be a positive integer');
    }
    this.clients = new Map<string, WebSocket>();
    this.heartbeatInterval = heartbeatInterval;
  }

  /**
   * Register a new WebSocket client.
   * @param ws - The WebSocket instance.
   * @param clientId - Unique identifier for the client.
   */
  handleConnection(ws: WebSocket, clientId: string): void {
    if (typeof clientId !== 'string' || clientId.length === 0) {
      throw new TypeError('clientId must be a non-empty string');
    }
    this.clients.set(clientId, ws);

    ws.on('close', () => {
      this.handleDisconnection(clientId);
    });

    ws.on('error', () => {
      this.handleDisconnection(clientId);
    });
  }

  /**
   * Remove a client cleanly from the handler.
   * @param clientId - Unique identifier of the client to remove.
   */
  handleDisconnection(clientId: string): void {
    if (typeof clientId !== 'string') {
      throw new TypeError('clientId must be a string');
    }
    const ws = this.clients.get(clientId);
    if (ws) {
      this.clients.delete(clientId);
      if (ws.readyState === ws.OPEN) {
        ws.close();
      }
    }
  }

  /**
   * Broadcast a message to all connected clients.
   * @param message - The message to broadcast.
   */
  broadcast(message: string): void {
    if (typeof message !== 'string') {
      throw new TypeError('message must be a string');
    }
    for (const [clientId, ws] of this.clients) {
      if (ws.readyState === ws.OPEN) {
        ws.send(message);
      }
    }
  }

  /**
   * Send a message to a specific client.
   * @param clientId - Unique identifier of the target client.
   * @param message - The message to send.
   * @returns `true` if the message was sent, `false` otherwise.
   */
  sendToClient(clientId: string, message: string): boolean {
    if (typeof clientId !== 'string') {
      throw new TypeError('clientId must be a string');
    }
    if (typeof message !== 'string') {
      throw new TypeError('message must be a string');
    }
    const ws = this.clients.get(clientId);
    if (ws && ws.readyState === ws.OPEN) {
      ws.send(message);
      return true;
    }
    return false;
  }

  /**
   * Start the heartbeat ping interval.
   */
  setupHeartbeat(): void {
    if (this.intervalId) {
      return;
    }
    this.intervalId = setInterval(() => {
      for (const [clientId, ws] of this.clients) {
        if (ws.readyState === ws.OPEN) {
          ws.ping();
        } else {
          this.handleDisconnection(clientId);
        }
      }
    }, this.heartbeatInterval);
  }

  /**
   * Close all sockets and clean up resources.
   */
  teardown(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    for (const [clientId, ws] of this.clients) {
      if (ws.readyState === ws.OPEN) {
        ws.close();
      }
    }
    this.clients.clear();
  }
}
