export interface CorsConfig {
  origin?: string | string[] | boolean;
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

export interface SslConfig {
  key: string | Buffer;
  cert: string | Buffer;
  ca?: string | Buffer;
  requestCert?: boolean;
  rejectUnauthorized?: boolean;
}

export interface LogConfig {
  level?: string;
  format?: string;
  output?: string;
  timestamp?: boolean;
  colorize?: boolean;
}

export interface ServerConfig {
  port?: number;
  host?: string;
  maxConnections?: number;
  requestTimeout?: number;
  keepAliveTimeout?: number;
  maxHeaderSize?: number;
  maxBodySize?: number;
  compression?: boolean;
  cors?: CorsConfig;
  ssl?: SslConfig;
  logging?: LogConfig;
}
