import { ApiError, AppConfig, Middleware } from '../core'
import { Repository, Schema, ValidationError, ValidationRule, Validator } from '../models'
import { DataStore, Service } from '../services'
import { Router } from './router'
import { RouteHandler } from './route-handler'

export class ResponseBuilder {
  private statusCode: number = 200
  private readonly headers: Map<string, string> = new Map()
  private body: unknown

  status(code: number): ResponseBuilder {
    this.statusCode = code
    return this
  }

  header(key: string, value: string): ResponseBuilder {
    this.headers.set(key, value)
    return this
  }

  json(data: unknown): ResponseBuilder {
    this.body = data
    this.headers.set('Content-Type', 'application/json')
    return this
  }

  text(text: string): ResponseBuilder {
    this.body = text
    this.headers.set('Content-Type', 'text/plain')
    return this
  }

  redirect(url: string): ResponseBuilder {
    this.statusCode = 302
    this.headers.set('Location', url)
    return this
  }

  cookie(name: string, value: string, options?: { httpOnly?: boolean; secure?: boolean; maxAge?: number; path?: string }): ResponseBuilder {
    let cookie = `${name}=${value}`
    if (options?.httpOnly) cookie += '; HttpOnly'
    if (options?.secure) cookie += '; Secure'
    if (options?.maxAge) cookie += `; Max-Age=${options.maxAge}`
    if (options?.path) cookie += `; Path=${options.path}`
    this.headers.set('Set-Cookie', cookie)
    return this
  }

  build(): { statusCode: number; headers: Record<string, string>; body: unknown } {
    const headers: Record<string, string> = {}
    this.headers.forEach((value, key) => {
      headers[key] = value
    })
    return {
      statusCode: this.statusCode,
      headers,
      body: this.body
    }
  }
}
