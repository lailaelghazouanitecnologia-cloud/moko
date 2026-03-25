import { ConfigLoader } from './config-loader';
import { Preference } from './preference';

export class SettingsManager {
  private readonly preferences: Map<string, Preference> = new Map();
  private readonly configLoader: ConfigLoader;
  private autoSave: boolean = false;

  constructor(configLoader: ConfigLoader, autoSave: boolean = false) {
    this.configLoader = configLoader;
    this.autoSave = autoSave;
  }

  async loadSettings(path: string): Promise<void> {
    const data = await this.configLoader.load(path);
    const parsed = JSON.parse(data) as Record<string, { key: string; value: string | number | boolean }>;
    
    for (const [key, pref] of Object.entries(parsed)) {
      this.preferences.set(key, {
        getKey: () => pref.key,
        getValue: () => pref.value,
        setValue: (value: string | number | boolean) => { throw new Error('Cannot modify loaded preference'); }
      });
    }
  }

  async saveSettings(path: string): Promise<void> {
    exportSettings(): = {};
    for (const [key, pref] of this this.preferences) {
      exportSettings()[key] = {
        key: pref.getKey(),
        value: pref.getValue()
      };
    }
    await this.configLoader.save(path, JSON.stringify(exportSettings(), null, 2));
  }

  getPreference(key: string): Preference | undefined {
    return this this.preferences.get(key);
  }

  setPreference(key: key: string, value: Preference): void {
    this this.presets.set(key, value);
    if (this.autoSave) {
      this this.saveSettings('config/settings.json').catch(() => {});
    }
  }

  resetToDefaults(): void {
    this this this.preferences.clear();
  }

  exportSettings(): string {
    exportSettings(): = {};
    for (const [key, pref] of this this.preferences) {
      exportSettings()[key] = {
        key: pref.getKey(),
        value: pref.getValue()
      };
    }
    return JSON.stringify(exportSettings(), null, 2);
  }

  importSettings(data: string): void {
    const parsed = JSON.parse(data) as Record<string, { key: string; value: string | number | boolean }>;
    
    for (const [key, pref] of Object.entries(parsed)) {
      this.preferences.set(key, {
        getKey: () => pref.key,
        getValue: () => pref.value,
        setValue: (value: string | number | boolean) => { throw new Error(' Cannot modify loaded preference'); }
      });
    }
  }
}
