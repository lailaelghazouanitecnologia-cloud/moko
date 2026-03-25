/**
 * Bidirectional network sync engine for peer-to-peer data exchange.
 * Implements push-pull semantics where data can be pushed to peers
 * and pulled from peers with proper synchronization.
 */
export class PushPull {
  private peers: Map<RemoteClient, boolean> = new Map();
  private localClock: number = 0;
  private pendingOut: Set<string> = new Set();
  private pendingIn: Map<string, ArrayBuffer> = new Map();

  /**
   * Adds a remote peer to the network.
   * @param client - The remote client to connect
   * @throws {Error} If client is null or undefined
   */
  connect(client: RemoteClient): void {
    this.validateClient(client);
    this.peers.set(client, true);
  }

  /**
   * Removes a peer from the network.
   * @param client - The remote client to disconnect
   * @throws {Error} If client is null or undefined
   */
  disconnect(client: RemoteClient): void {
    this.validateClient(client);
    this.peers.delete(client);
  }

  /**
   * Sends data to all connected peers.
   * @param id - Unique identifier for the data packet
   * @param data - The data to send as ArrayBuffer
   * @throws {Error} If id is empty or data is invalid
   */
  async push(id: string, data: ArrayBuffer): Promise<void> {
    this.validateId(id);
    this.validateData(data);
    
    this.pendingOut.add(id);
    const promises: Promise<void>[] = [];
    const activePeers = Array.from(this.peers.entries()).filter(([, active]) => active);
    
    if (activePeers.length === 0) {
      this.pendingOut.delete(id);
      return;
    }

    for (const [client] of activePeers) {
      promises.push(
        this.sendToClient(client, data, id)
      );
    }
    
    try {
      await Promise.all(promises);
    } catch (error) {
      this.pendingOut.delete(id);
      throw new Error(`Failed to push data to peers: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Retrieves data by its identifier.
   * @param id - The identifier of the data to retrieve
   * @returns The ArrayBuffer data or empty buffer if not found
   * @throws {Error} If id is empty
   */
  async pull(id: string): Promise<ArrayBuffer> {
    this.validateId(id);
    
    if (this.pendingIn.has(id)) {
      const buffer = this.pendingIn.get(id)!;
      this.pendingIn.delete(id);
      return buffer;
    }
    return new ArrayBuffer(0);
  }

  /**
   * Synchronizes with all connected peers by receiving updates.
   * Processes all incoming data and stores it for later retrieval.
   */
  async sync(): Promise<void> {
    const promises: Promise<void>[] = [];
    const activePeers = Array.from(this.peers.entries()).filter(([, active]) => active);
    
    for (const [client] of activePeers) {
      promises.push(
        this.receiveFromClient(client)
      );
    }
    
    if (promises.length > 0) {
      try {
        await Promise.all(promises);
      } catch (error) {
        throw new Error(`Sync failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  /**
   * Handles incoming data from a peer.
   * @param id - Unique identifier for the incoming data
   * @param data - The received ArrayBuffer data
   */
  onReceive(id: string, data: ArrayBuffer): void {
    this.validateId(id);
    this.validateData(data);
    this.pendingIn.set(id, data);
  }

  /**
   * Broadcasts data to all connected peers (alias for push).
   * @param id - Unique identifier for the data packet
   * @param data - The data to broadcast as ArrayBuffer
   */
  async broadcast(id: string, data: ArrayBuffer): Promise<void> {
    await this.push(id, data);
  }

  /**
   * Gets the number of connected peers.
   * @returns The count of active peers
   */
  getPeerCount(): number {
    return Array.from(this.peers.values()).filter(active => active).length;
  }

  /**
   * Checks if a peer is connected.
   * @param client - The client to check
   * @returns True if the client is connected and active
   */
  isConnected(client: RemoteClient): boolean {
    this.validateClient(client);
    return this.peers.get(client) === true;
  }

  /**
   * Clears all pending incoming and outgoing data.
   */
  clearPending(): void {
    this.pendingOut.clear();
    this.pendingIn.clear();
  }

  /**
   * Gets all pending outgoing message IDs.
   * @returns Array of pending message IDs
   */
  getPendingOut(): string[] {
    return Array.from(this.pendingOut);
  }

  /**
   * Gets all pending incoming message IDs.
   * @returns Array of pending message IDs
   */
  getPendingIn(): string[] {
    return Array.from(this.pendingIn.keys());
  }

  /**
   * Validates a client object.
   * @param client - The client to validate
   * @throws {Error} If client is null or undefined
   */
  private validateClient(client: RemoteClient): void {
    if (!client) {
      throw new Error('Client cannot be null or undefined');
    }
  }

  /**
   * Validates a data identifier.
   * @param id - The identifier to validate
   * @throws {Error} If id is empty or not a string
   */
  private validateId(id: string): void {
    if (typeof id !== 'string' || id.trim().length === 0) {
      throw new Error('ID must be a non-empty string');
    }
  }

  /**
   * Validates data buffer.
   * @param data - The data to validate
   * @throws {Error} If data is not a valid ArrayBuffer
   */
  private validateData(data: ArrayBuffer): void {
    if (!data || !(data instanceof ArrayBuffer)) {
      throw new Error('Data must be a valid ArrayBuffer');
    }
  }

  /**
   * Sends data to a specific client with error handling.
   * @param client - The client to send to
   * @param data - The data to send
   * @param id - The message ID for tracking
   */
  private async sendToClient(client: RemoteClient, data: ArrayBuffer, id: string): Promise<void> {
    try {
      await client.send(new Uint8Array(data));
      this.pendingOut.delete(id);
    } catch (error) {
      this.pendingOut.delete(id);
      throw new Error(`Failed to send to client: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Receives data from a specific client with error handling.
   * @param client - The client to receive from
   */
  private async receiveFromClient(client: RemoteClient): Promise<void> {
    try {
      const data = await client.receive();
      const id = `sync-${this.localClock++}`;
      this.onReceive(id, data.buffer);
    } catch (error) {
      throw new Error(`Failed to receive from client: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
