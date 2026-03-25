import { SystemInfoClient, RecordingClient, RecordingContextManager, SulaClient, AutoScreenshotWrapper } from '../platform';
import { Logger } from '../utils';

type FeatureName = 'screenshot' | 'shell' | 'python' | 'file_ops' | 'window_mgmt' | 'recording' | 'accessibility' | 'platform_adapter';

interface FeatureReport {
  screenshot: boolean;
  shell: boolean;
  python: boolean;
  file_ops: boolean;
  window_mgmt: boolean;
  recording: boolean;
  accessibility: boolean;
  readonly platform_adapter: boolean;
  [key: string]: boolean;
}

export class FeatureChecker {
  private readonly platform_adapter: unknown;
  private readonly accessibility_helper: unknown;
  private readonly platform: unknown;
  private cache: Record<string, boolean> = {};

  constructor(platform_adapter: unknown, accessibility_helper: unknown, platform: unknown) {
    if (platform_adapter == null) {
      throw new TypeError('platform_adapter is required');
    }
    if (accessibility_helper == null) {
      throw new TypeError('accessibility_helper is required');
    }
    if (platform == null) {
      throw new TypeError('platform is required');
    }
    this.platform_adapter = platform_adapter;
    this.accessibility_helper = accessibility_helper;
    this.platform = platform;
  }

  check_screenshot_available(use_cache = true): boolean {
    if (use_cache && 'screenshot' in this.cache) {
      return this.cache.screenshot;
    }
    const available = this.platform_adapter instanceof SulaClient;
    this.cache.screenshot = available;
    return available;
  }

  check_shell_available(use_cache = true): boolean {
    if (use_cache && 'shell' in this.cache) {
      return this.cache.shell;
    }
    const available = this.platform === 'linux' || this.platform === 'macos';
    this.cache.shell = available;
    return available;
  }

  check_python_available(use_cache = true): boolean {
    if (use_cache && 'python' in this.cache) {
      return this.cache.python;
    }
    const available = this.platform === 'linux' || this.platform === 'macos';
    this.cache.python = available;
    return available;
  }

  check_file_ops_available(use_cache = true): boolean {
    if (use_cache && 'file_ops' in this.cache) {
      return this.cache.file_ops;
    }
    const available = this.platform === 'linux' || this.platform === 'macos' || this.platform === 'windows';
    this.cache.file_ops = available;
    return available;
  }

  check_window_mgmt_available(use_cache = true): boolean {
    if (use_cache && 'window_mgmt' in this.cache) {
      return this.cache.window_mgmt;
    }
    const available = this.platform === 'linux' || this.platform === 'macos' || this.platform === 'windows';
    this.cache.window_mgmt = available;
    return available;
  }

  check_recording_available(use_cache = true): boolean {
    if (use_cache && 'recording' in this.cache) {
      return this.cache.recording;
    }
    const available = this.platform_adapter instanceof RecordingClient ||
                   this.platform_adapter instanceof RecordingContextManager ||
                   this.platform_adapter instanceof AutoScreenshotWrapper;
    this.cache.recording = available;
    return available;
  }

  check_accessibility_available(use_cache = true): boolean {
    if (use_cache && 'accessibility' in this.cache) {
      return this.cache.accessibility;
    }
    const available = this.accessibility_helper !== null && this.accessibility_helper !== undefined;
    this.cache.accessibility = available;
    return available;
  }

  check_platform_adapter_available(use_cache = true): boolean {
    if (use_cache && 'platform_adapter' in this.cache) {
      return this.cache.platform_adapter;
    }
    const available = this.platform_adapter !== null && this.platform_adapter !== undefined;
    this.cache.platform_adapter = available;
    return available;
  }

  check_all_features(use_cache = true): FeatureReport {
    return {
      screenshot: this.check_screenshot_available(use_cache),
      shell: this.check_shell_available(use_cache),
      python: this.check_python_available(use_cache),
      file_ops: this.check_file_ops_available(use_cache),
      window_mgmt: this.check_window_mgmt_available(use_cache),
      recording: this.check_recording_available(use_cache),
      accessibility: this.check_accessibility_available(use_cache),
      platform_adapter: this.check_platform_adapter_available(use_cache)
    };
  }

  clear_cache(): void {
    this.cache = {};
  }

  get_feature_report(): FeatureReport & { platform: unknown } {
    return {
      ...this.check_all_features(),
      platform: this.platform
    };
  }
}
