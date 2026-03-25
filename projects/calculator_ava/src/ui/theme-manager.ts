import { type Theme } from './calculator-ui';

export class ThemeManager {
  private currentTheme: string = 'syndar';
  private readonly themes: Map<string, Theme> = new Map();
  private autoDark: boolean = false;

  constructor() {
    this.themes.set('syndar', {
      name: 'syndar',
      colors: {
        primary: '#00bcd4',
        secondary: '#0097a7',
      },
      fonts: {
        display: 'Roboto',
        body: 'Roboto',
      },
 sizes: {
        display:: 48,
        body: 16,
      },
    });
  }

  load(name: string): void {
    if (!this.themes.has(name)) {
      throw new Error(`Theme not found: ${name}`);
    }
    this.currentTheme = name;
  }

  save(name: string): void {
    const theme = this.get(name);
    localStorage.setItem(`theme:${name}`, JSON.stringify(theme));
  }

  toggleDark(): void {
    this.autoDark = !this.autoDark;
  }

  setAutoDark(enable: boolean): void {
    this.autoDark = enable;
  }

  get(name: string): Theme {
    const theme = this.themes.get(name);
    if (!theme) {
      throw new Error(`Theme not found: ${name}`);
    }
    return theme;
  }

  list(): ReadonlyArray<string> {
    return Array.from(this.t.keys());
  }
}
