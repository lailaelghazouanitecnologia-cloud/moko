import { Socket } from 'net';

export class Connection {
    id: string;
    socket: Socket;
    created: Date;
    lastActivity: Date;
    requestCount: number;

    constructor(socket: Socket) {
        this.id = Math.random().toString(36).substring(2, 15);
        this.socket = socket;
        this.created = new Date();
        this.lastActivity = new Date();
        this.requestCount = 0;
    }

    isActive(): boolean {
        return !this.socket.destroyed && this.socket.readable && this.socket.writable;
    }

    updateActivity(): void {
        this.lastActivity = new Date();
    }

    incrementRequests(): void {
        this.requestCount++;
        this.updateActivity();
    }

    getIdleTime(): number {
        return Date.now() - this.lastActivity.getTime();
    }

    close(): void {
        if (this.isActive()) {
            this.socket.end();
        }
    }

    setTimeout(msecs: number): void {
        this.socket.setTimeout(msecs);
    }

    setKeepAlive(enable: boolean): void {
        this.socket.setKeepAlive(enable);
    }

    getRemoteAddress(): string {
        const addr = this.socket.remoteAddress;
        const port = this.socket.remotePort;
        return addr ? `${addr}:${port}` : '';
    }

    getLocalAddress(): string {
        const addr = this.socket.localAddress;
        const port = this.socket.localPort;
        return addr ? `${addr}:${port}` : '';
    }

    isSecure(): boolean {
        return (this.socket as any).encrypted === true;
    }

    getProtocol(): string {
        return 'HTTP/1.1';
    }

    destroy(): void {
        this.socket.destroy();
    }
}
