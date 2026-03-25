export interface GUIConnector {
  readonly sessionId: string;
  connect(config: Record<string, unknown>): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  sendCommand(command: string, params?: Record<string, unknown>): Promise<unknown>;
  takeScreenshot(): Promise<Buffer>;
  getElementBounds(selector: string): Promise<{ x: number; y: number; w: number; h: number }>;
}
