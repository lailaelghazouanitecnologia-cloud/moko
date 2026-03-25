import { GUISession } from './gui-session';

export interface GUIProvider {
  readonly id: string;
  readonly isConnected: boolean;

  connect(config: Record<string, unknown>): Promise<void>;
  disconnect(): Promise<void>;
  createSession(name: string): Promise<GUISession>;
  listSessions(): Promise<ReadonlyArray<GUISession>>;
  getSession(id: string): Promise<GUISession | null>;
}
