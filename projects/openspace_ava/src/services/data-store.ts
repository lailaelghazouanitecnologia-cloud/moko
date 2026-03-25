import { Map } from 'immutable'
import { ApiError, AppConfig, Middleware } from '../core'
import { ValidationError, ValidationRule, Validator } from '../models/validator';
import { Service } from './service'

type ConnectOpts = {
  timeout?: number
  retry?: boolean
  auth?: { user: string; pass: string }
}

type WatchHandler = (key: string, value: unknown) => void

type Adapter = {
  connect: (uri: string, opts?: ConnectOpts) => Promise<void>
  disconnect: () => Promise<void>
  get: (key: string) => unknown
  set: (key: string, value: unknown, ttl?: number) => Promise<void>
  delete: (key: string) => Promise<boolean>
  keys: (pattern?: string) => Promise<string[]>
  exists: (key: string) => Promise<boolean>
  clear: () => Promise<void>
}

export class DataStore extends Service {
  private readonly watchers: Map<string, WatchHandler[]>
  private readonly cache: Map<string, unknown>
  private readonly adapters: Map<string, Adapter>
  private readonly defaultTTL: number

  constructor(defaultTTL: number = 60000) {
    super(defaultTTL)
    this.cache = new Map()
    this.adapters = new Map()
    this.watchers = new Map()
    this.defaultTTL = defaultTTL
  }

  async connect(uri: string, options?: ConnectOpts): Promise<void> {
    const adapter = this.adapters.get(uri) ?? this.createAdapter(uri)
    await adapter.connect(uri, options)
    this.adapters.set(uri, adapter)
  }

  async get(key: string): unknown {
    if (this.cache.has(key)) return this.cache.get(key)
    for (const adapter of this.adapters.values()) {
      const value = await adapter.get(key)
      if (value != null) {
        this.cache.set(key, value)
        return value
      }
    }
    return undefined
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    if (ttl !== undefined && (typeof ttl !== 'number' || ttl < 0)) {
      throw new RangeError('ttl must be a non-negative number')
    }
    const effectiveTtl = ttl ?? this.defaultTTL
    this.cache.set(key, value)
    for (const adapter of this.adapters.values()) {
      await adapter.set(key, value, effectiveTtl)
    }
  }

  async delete(key: string): Promise<boolean> {
    this.cache.delete(key)
    let deleted = false
    for (const adapter of this.adapters.values()) {
      deleted = (await adapter.delete(key)) || deleted
    }
    return deleted
  }

  async clear(): Promise<void> {
    this.cache.clear()
    for (const adapter of this.adapters.values()) {
      await adapter.clear()
    }
  }

  async keys(pattern?: string): Promise<string[]> {
    if (pattern !== undefined && typeof pattern !== 'string') {
      throw new TypeError('pattern must be a string if provided')
    }
    const allKeys = new Set<string>()
    for (const adapter of this.adapters.values()) {
      const keys = await adapter.keys(pattern)
      keys.forEach((k: string) => allKeys.add(k))
    }
    return Array.from(allKeys)
  }

  async exists(key: string): Promise<boolean> {
    if (this.cache.has(key)) return true
    for (const adapter of this.adapters.values()) {
      if (await adapter.exists(key)) return true
    }
    return false
  }

  watch(key: string, handler: WatchHandler): void {
    if (!this.watchers.has(key)) {
      this.watchers.set(key, [])
    }
    this.watchers.get(key)!.push(handler)
  }

  private createAdapter(uri: string): Adapter {
    throw new Error('createAdapter not implemented')
  }
}
