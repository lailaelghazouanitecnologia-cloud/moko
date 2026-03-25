import { EventEmitter } from 'events';

/**
 * Manages connection to a remote peer over WebSocket.
 * Provides send/receive, keep-alive, and graceful disconnect.
 */
export class RemoteClient extends EventEmitter {
  id: string;
  url: string;
  connected: boolean;
  lastSeen: Date;

  private socket: WebWebSocket | null = null;
  private messageQueue: Uint8Array[] = [];
  private isConnecting = false;
  private readonly CONNECT_TIMEOUT = 30000;
  private readonly RECEIVE_TIMEOUT = 30000;
  private readonly PING_TIMEOUT = 5000;
  private readonly ALIVE_THRESHOLD = 60000;

  /**
   * Creates a new remote client.
   * @param id Unique identifier for this peer.
   * @param url WebSocket URL (ws:// or wss://).
   */
  constructor(id: string, url: string) {
    super();
    this.id = id;
    this.url = url;
    this.connected = false;
    this.lastSeen = new Date();
    this.validateConstructorArgs();
  }

  /**
   * Establ network link to the remote peer.
   * @throws If connection fails or timeout occurs.
   */
  async connect(): Promise<void> {
    if (this.connected) return;
    if (this.isConnecting) return;

    this.isConnecting = true;
    this.emit('connecting');

    return new Promise<void>((resolve, reject) => {
      try {
        this.socket = new WebWebSocket(this.url);
        this.socket.binaryType = 'arraybuffer';

        const onOpen = () => {
          this.connected = true;
          this.isConnecting = false;
          this.updateLastSeen(new Date());
          this.emit('connect');
          resolve();
        };

        const onError = (err: Event) => {
          this.isConnecting = false;
          this.cleanupSocket();
          reject(new Error(`Connection to ${this.url} failed: ${err}`));
        };

        const onClose = () => {
          this.connected = false;
          this.cleanupSocket();
          this.emit('disconnect');
        };

        this.socket.addEvent('open', onOpen);
        this.socket.addEvent('error', onError);
        this.socket.addEvent('close', onClose);

        const timeout = setTimeout(() => {
          if (this.isConnecting) {
            this.socket?.close();
            this.isConnecting = false;
            reject(new Error('Connection timeout'));
          }
        }, this.CONNECT_TIMEOUT);
      } catch (err) {
        this.isConnecting = false;
        this.cleanupSocket();
        reject(err);
      }
    });
  }

  /**
   * Close the connection and clean up resources.
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.cleanupSocket();
    }
    this.connected = false;
    this.isConnecting = false;
  }

  /**
   * Push binary data to the remote peer.
   * @param data Binary payload.
   * @throws If not connected or socket is not ready.
   */
  async send(data: Uint8Array): Promise<void> {
    this.validateSendData(data);
    if (!this.connected || !this.socket) {
      throw new Error('Not connected');
    }

    return new Promise<void>((resolve, reject) => {
      if (this.socket!.readyState === WebWebSocket.OPEN) {
        this.socket!.send(data);
        resolve();
      } else {
        reject(new Error('Socket not ready'));
      }
    });
  }

  /**
   * Pull binary data from the remote peer.
   * @returns Binary payload.
   * @throws If not connected or receive timeout occurs.
   */
  async receive(): Promise<Uint8Array> {
    if (!this.connected || !this.socket) {
      throw new Error('Not connected');
    }

    return new Promise<Uint8Array>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Receive timeout'));
      }, this.RECEIVE_TIMEOUT);

      const onMessage = (event: MessageEvent) => {
        clearTimeout(timeout);
        this.socket!.removeEvent('message', onMessage);
        const buffer = new Uint8Array(event.data);
        resolve(buffer);
      };

      this.socket.addEvent('message', onMessage);
    });
  }

  /**
   * Measure latency to the remote peer.
   * @returns Round-trip time in milliseconds.
   * @throws If not connected or ping timeout occurs.
   */
  async ping(): Promise<number> {
    if (!this.connected || !this.socket) {
      throw new Error('Not connected');
    }

    const start = Date.now();

    return new Promise<number>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Ping timeout'));
      }, this.PING_TIMEOUT);

      const pingData = new Uint8Array(1);
      pingData[0] = 0x50; // 'P'

      const onPong = () => {
        clearTimeout(timeout);
        const latency = Date.now() - start;
        resolve(latency);
      };

      this.socket!.send(pingData);
      setTimeout(onPong, 0);
    });
  }

  /**
   * Check heartbeat.
   * @returns True if the connection is alive.
   */
  isAlive(): boolean {
    const now = new Date();
    return this.connected && (now.getTime() - this.lastSeen.getTime()) < this.ALIVE_THRESHOLD;
  }

  /**
   * Timestamp activity.
   * @param ts New timestamp to set.
   */
  updateLastSeen(ts: Date): void {
    if (!(ts instanceof Date) || isNaN(ts.getTime())) {
      throw new Error('Invalid Date provided');
    }
    this.lastSeen = new Date(ts);
  }

  /* ------------------------------------------------------------------ */
  /* Private helpers                                                    */
  /* ------------------------------------------------------------------ */

  private validateConstructorArgs(): void {
    if (typeof this.id !== 'string' || this.id.length === 0) {
      throw new Error('Invalid id');
    }
    if (typeof this.url !== 'string' || !this.url.startsWith('ws')) {
      throw new Error('Invalid WebSocket URL');
    }
  }

  private validateSendData(data: Uint8Array): void {
    if (!(data instanceof Uint8Array) || data.length === 0) {
      throw new Error('Invalid data: expected non-empty Uint8Array');
    }
  }

  private cleanupSocket(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket = null;
    }
  }
}
