import { GUIConnector } from './gui-connector'
import { GUIProvider } from './gui-provider'
import { GUISession } from './gui-session'

export class GUIAgentTool {
  private readonly connector: GUIConnector
  private readonly session: GUISession
  private readonly provider: GUIProvider

  constructor(connector: GUIConnector, session: GUISession, provider: GUIProvider) {

    this.connector = connector
    this.session = session
    this.provider = provider
  }

  async start(): Promise<void> {
    await this.session.start()
  }

  async stop(): Promise<void> {
    await this.session.stop()
  }

  async click(selector: string): Promise<void> {
    const bounds = await this.connector.getElementBounds(selector)
    await this.connector.sendCommand('click', { x: bounds.x + bounds.w / 2, y: bounds.y + bounds.h / 2 })
  }

  async type(selector: string): Promise<void> {
    await this.connector.sendCommand('waitForElement', { selector, timeout: 5000 })
  }

  async screenshot(path: string): Promise<void> {
    const buffer = await this.connector.takeScreenshot()
    await this.connector.sendCommand('saveScreenshot', { path, buffer })
  }

  async scroll(direction: 'up' | 'down'): Promise<void> {
    if (direction !== 'up' && direction !== 'down') {
      throw new TypeError("direction must be 'up' or 'down'")
    }
    await this.connector.sendCommand('scroll', { direction, amount: 300 })
  }

  async getText(selector: string): Promise<string> {
    const result = await this.connector.sendCommand('getText', { selector })
    return result as string
  }
}
