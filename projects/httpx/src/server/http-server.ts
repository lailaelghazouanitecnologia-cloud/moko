import { createServer, IncomingMessage, ServerResponse, Server as HttpServerType } from 'http';
import { Socket } from 'net';
import { ServerOptions } from './server-config';

export class HttpServer {
    private server: HttpServerType | null = null;
    private port: number = 0;
    private listening: boolean = false;
    private requestCount: number = 0;
    private errorCount: number = 0;
    private compressionEnabled: boolean = false;
    private serverHeader: string = '';
    private maxHeaders: number = 2000;
    private maxBodySize: number = 1024 * 1024;
    private keepAliveEnabled: boolean = true;
    private keepAliveDelay: number = 5000;
    private timeout: number = 120000;

    createServer(options?: ServerOptions): HttpServerType {
        this.server = createServer((req: IncomingMessage, res: ServerResponse) => {
            this.requestCount++;
            
            if (this.serverHeader) {
                res.setHeader('Server', this.serverHeader);
            }
            
            if (this.compressionEnabled) {
                res.setHeader('Content-Encoding', 'gzip');
            }
            
            res.setHeader('Keep-Alive', this.keepAliveEnabled ? `timeout=${this.keepAliveDelay}` : 'close');
            res.setHeader('Connection', this.keepAliveEnabled ? 'keep-alive' : 'close');
            
            req.on('error', () => {
                this.errorCount++;
            });
            
            res.on('error', () => {
                this.errorCount++;
            });
        });
        
        this.server.maxHeadersCount = this.maxHeaders;
        this.server.timeout = this.timeout;
        
        return this.server;
    }

    listen(port: number): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.server) {
                this.createServer();
            }
            
            this.server!.listen(port, () => {
                this.port = port;
                this.listening = true;
                resolve();
            });
            
            this.server!.on('error', (error) => {
                reject(error);
            });
        });
    }

    close(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.server || !this.listening) {
                resolve();
                return;
            }
            
            this.server.close((error) => {
                if (error) {
                    reject(error);
                } else {
                    this.listening = false;
                    this.port = 0;
                    resolve();
                }
            });
        });
    }

    setTimeout(msecs: number): void {
        this.timeout = msecs;
        if (this.server) {
            this.server.timeout = msecs;
        }
    }

    setKeepAlive(enable: boolean, delay: number = 5000): void {
        this.keepAliveEnabled = enable;
        this.keepAliveDelay = delay;
    }

    handleUpgrade(req: IncomingMessage, socket: Socket, head: Buffer): void {
        if (!this.server) {
            return;
        }
        
        this.server.emit('upgrade', req, socket, head);
    }

    getListeningPort(): number {
        if (!this.server || !this.listening) {
            return 0;
        }
        
        const address = this.server.address();
        if (address && typeof address !== 'string') {
            return address.port;
        }
        
        return this.port;
    }

    isListening(): boolean {
        return this.listening;
    }

    setMaxHeaders(count: number): void {
        this.maxHeaders = count;
        if (this.server) {
            this.server.maxHeadersCount = count;
        }
    }

    setMaxBodySize(size: number): void {
        this.maxBodySize = size;
    }

    enableCompression(enable: boolean): void {
        this.compressionEnabled = enable;
    }

    setServerHeader(value: string): void {
        this.serverHeader = value;
    }

    getRequestCount(): number {
        return this.requestCount;
    }

    getErrorCount(): number {
        return this.errorCount;
    }

    resetStats(): void {
        this.requestCount = 0;
        this.errorCount = 0;
    }
}
