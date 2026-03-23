import { ReadableStream, WritableStream, ReadableStreamDefaultReader } from 'stream/web';

export class RequestBody {
    private _stream: ReadableStream;
    private _used: boolean = false;

    constructor(stream: ReadableStream) {
        this._stream = stream;
    }

    async text(): Promise<string> {
        if (this._used) {
            throw new TypeError('Body has already been read');
        }
        this._used = true;

        const reader = this._stream.getReader();
        const decoder = new TextDecoder('utf-8');
        let result = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                result += decoder.decode(value, { stream: true });
            }
            result += decoder.decode();
            return result;
        } finally {
            reader.releaseLock();
        }
    }

    async json(): Promise<any> {
        const text = await this.text();
        try {
            return JSON.parse(text);
        } catch (e) {
            throw new TypeError('Invalid JSON');
        }
    }

    async arrayBuffer(): Promise<ArrayBuffer> {
        if (this._used) {
            throw new TypeError('Body has already been read');
        }
        this._used = true;

        const reader = this._stream.getReader();
        const chunks: Uint8Array[] = [];
        let totalLength = 0;

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
                totalLength += value.byteLength;
            }

            const result = new ArrayBuffer(totalLength);
            const view = new Uint8Array(result);
            let offset = 0;

            for (const chunk of chunks) {
                view.set(chunk, offset);
                offset += chunk.byteLength;
            }

            return result;
        } finally {
            reader.releaseLock();
        }
    }

    async blob(): Promise<Blob> {
        const buffer = await this.arrayBuffer();
        return new Blob([buffer]);
    }

    async formData(): Promise<FormData> {
        const text = await this.text();
        const formData = new FormData();
        
        const boundary = this._extractBoundary(text);
        if (!boundary) {
            throw new TypeError('Invalid multipart/form-data');
        }

        const parts = text.split(`--${boundary}`);
        for (const part of parts) {
            if (!part || part.includes('--')) continue;
            
            const headerEnd = part.indexOf('\r\n\r\n');
            if (headerEnd === -1) continue;
            
            const headers = part.substring(0, headerEnd);
            const content = part.substring(headerEnd + 4, part.lastIndexOf('\r\n'));
            
            const nameMatch = headers.match(/name="([^"]+)"/);
            const filenameMatch = headers.match(/filename="([^"]+)"/);
            
            if (filenameMatch) {
                const blob = new Blob([content], { type: 'application/octet-stream' });
                formData.append(nameMatch![1], blob, filenameMatch[1]);
            } else if (nameMatch) {
                formData.append(nameMatch[1], content);
            }
        }

        return formData;
    }

    private _extractBoundary(text: string): string | null {
        const match = text.match(/boundary=([^;\r\n]+)/);
        return match ? match[1] : null;
    }

    stream(): ReadableStream {
        if (this._used) {
            throw new TypeError('Body has already been read');
        }
        this._used = true;
        return this._stream;
    }

    async pipe(destination: WritableStream): Promise<void> {
        if (this._used) {
            throw new TypeError('Body has already been read');
        }
        this._used = true;

        const reader = this._stream.getReader();
        const writer = destination.getWriter();

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                await writer.write(value);
            }
            await writer.close();
        } catch (error) {
            await writer.abort(error);
            throw error;
        } finally {
            reader.releaseLock();
            writer.releaseLock();
        }
    }

    tee(): [RequestBody, RequestBody] {
        if (this._used) {
            throw new TypeError('Body has already been read');
        }
        this._used = true;

        const [stream1, stream2] = this._stream.tee();
        return [new RequestBody(stream1), new RequestBody(stream2)];
    }

    async cancel(): Promise<void> {
        if (this._used) {
            return;
        }
        this._used = true;

        const reader = this._stream.getReader();
        try {
            await reader.cancel();
        } finally {
            reader.releaseLock();
        }
    }

    getReader(): ReadableStreamDefaultReader {
        if (this._used) {
            throw new TypeError('Body has already been read');
        }
        this._used = true;
        return this._stream.getReader();
    }

    get used(): boolean {
        return this._used;
    }
}
