import { SettingsManager } from './settings-manager';
import { Preference } from './preference';
import { Evaluator, ConstantRegistry } from '../engine';
import { HistoryStore } from '../history';
import { ExpressionParser, Tokenizer } from '../parser';
import { CalculatorUI, InputHandler, DisplayController } from '../ui';

export class ConfigLoader {
  private readonly settingsManager: SettingsManager;

  constructor(settingsManager: SettingsManager) {
    this.settingsManager = settingsManager;
  }

  async loadConfig(path: string): Promise<void> {
    const response = await fetch(path);
    const data = await response.json();
    
    for (const [key, value] of Object.entries(data)) {
      const preference: Preference = {
        key,
        value: value as string | number | boolean,
        getKey(): string {
          return this.key;
        },
        getValue(): string | number | boolean {
          return this.value;
        },
        setValue(newValue: string | number | boolean): void {
          this.value = newValue;
        }
      };
      this.settingsManager.setPreference(key, preference);
    }
  }

  async saveConfig(path: string): Promise<void> {
    const data: Record<string, string | number | boolean> = {};
    
    for (const [key, preference] of this.settingsManager.preferences) {
      data[key] = preference.getValue();
    }
    
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = path;
    a.click();
    
    URL.revokeObjectURL(url);
  }

  getConfig(key: string): string | number | boolean | undefined {
    const preference = this.settingsManager.getPreference(key);
    return preference?.getValue();
  }

  setConfig(key: string, value: string | number | boolean): void {
    const existing = this.settingsManager.getPreference(key);
    
    if (existing) {
      existing.setValue(value);
    } else {
      const preference: Preference = {
        key,
        value,
        getKey(): string {
          return this.key;
        },
        getValue(): string | number | boolean {
          return this.value;
        },
        setValue(newValue: string | number | boolean): void {
          this.value = newValue;
        }
      };
      this.settingsManager.setPreference(key, preference);
    }
  }

  hasConfig(key: string): boolean {
    return this.settingsManager.getPreference(key) !== undefined;
  }

  deleteConfig(key: string): void {
    this.settingsManager.preferences.delete(key);
  }

  listConfigs(): ReadonlyArray<string> {
    return Array.from(this.settingsManager.preferences.keys());
  }

  clearConfigs(): void {
    this.settingsManager.preferences.clear();
  }

  exportConfigs(): string {
    return this.settingsManager.exportSettings();
  }

  importConfigs(data: string): void {
    this.settingsManager.importSettings(data);
  }

  resetToDefaults(): void {
    this.settingsManager.resetToDefaults();
  }
}
