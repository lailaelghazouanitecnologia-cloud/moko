import { FeatureChecker } from './feature-checker';
import { HealthStatus } from './health-status';
import { SystemInfoClient, ScreenshotClient } from '../platform';
import { Logger } from '../utils';
import * as fs from 'fs';
import * as path from 'path';

export class HealthChecker {
  private readonly feature_checker: FeatureChecker;
  private readonly base_url: string;
  private readonly results: Record<string, HealthStatus>;
  private readonly auto_cleanup: boolean;
  private readonly test_output_dir: string;
  private readonly temp_files: string[];

  constructor(
    feature_checker: FeatureChecker,
    base_url: string = "http://127.0.0.1:5000",
    auto_cleanup: boolean = true,
    test_output_dir: string | null = null
  ) {
    if (test_output_dir !== null && (typeof test_output_dir !== 'string' || !test_output_dir.trim())) {
      throw new TypeError('test_output_dir must be a non-empty string or null');
    }

    this.feature_checker = feature_checker;
    this.base_url = base_url;
    this.results = {};
    this.auto_cleanup = auto_cleanup;
    this.test_output_dir = test_output_dir ?? "test_output";
    this.temp_files = [];
  }

  cleanup_temp_files(): void {
    for (const file of this.temp_files) {
      try {
        fs.unlinkSync(file);
      } catch {
        // ignore cleanup errors
      }
    }
    this.temp_files.length = 0;
  }

  check_screenshot(): [boolean, string] {
    const available = this.feature_checker.check_screenshot_available();
    if (!available) {
      return [false, "Screenshot feature not available"];
    }
    try {
      const client = new ScreenshotClient(this.base_url);
      const size = client.getScreenSize();
      return [true, `Screen size: ${size.width}x${size.height}`];
    } catch (error) {
      return [false, `Screenshot check failed: ${error instanceof Error ? error.message : String(error)}`];
    }
  }

  check_cursor_position(): [boolean, string] {
    const available = this.feature_checker.check_platform_adapter_available();
    if (!available) {
      return [false, "Platform adapter not available"];
    }
    try {
      const client = new SystemInfoClient(this.base_url);
      const pos = client.get_cursor_position();
      return [true, `Cursor at (${pos.x}, ${pos.y})`];
    } catch (error) {
      return [false, `Cursor position check failed: ${error instanceof Error ? error.message : String(error)}`];
    }
  }

  check_screen_size(): [boolean, string] {
    const available = this.feature_checker.check_platform_adapter_available();
    if (!available) {
      return [false, "Platform adapter not available"];
    }
    try {
      const client = new SystemInfoClient(this.base_url);
      const size = client.get_screen_size();
      return [true, `Screen size: ${size.width}x${size.height}`];
    } catch (error) {
      return [false, `Screen size check failed: ${error instanceof Error ? error.message : String(error)}`];
    }
  }

  check_shell_command(): [boolean, string] {
    const available = this.feature_checker.check_shell_available();
    return [available, available ? "Shell commands available" : "Shell not available"];
  }

  check_python_execution(): [boolean, string] {
    const available = this.feature_checker.check_python_available();
    return [available, available ? "Python execution available" : "Python not available"];
  }

  check_bash_script(): [boolean, string] {
    const available = this.feature_checker.check_shell_available();
    return [available, available ? "Bash scripts available" : "Bash not available"];
  }

  check_file_operations(): [boolean, string] {
    const available = this.feature_checker.check_file_ops_available();
    return [available, available ? "File operations available" : "File operations not available"];
  }

  check_desktop_path(): [boolean, string] {
    const available = this.feature_checker.check_platform_adapter_available();
    return [available, available ? "Desktop path available" : "Desktop path not available"];
  }

  check_window_management(): [boolean, string] {
    const available = this.feature_checker.check_window_mgmt_available();
    return [available, available ? "Window management available" : "Window management not available"];
  }

  check_recording(): [boolean, string] {
    const available = this.feature_checker.check_recording_available();
    return [available, available ? "Recording available" : "Recording not available"];
  }

  check_accessibility(): [boolean, string] {
    const available = this.feature_checker.check_accessibility_available();
    return [available, available ? "Accessibility available" : "Accessibility not available"];
  }

  check_health_endpoint(): [boolean, string] {
    try {
      const client = new SystemInfoClient(this.base_url);
      client.get_system_info();
      return [true, "Health endpoint responding"];
    } catch (error) {
      return [false, `Health endpoint failed: ${error instanceof Error ? error.message : String(error)}`];
    }
  }

  check_platform_info(): [boolean, string] {
    const available = this.feature_checker.check_platform_adapter_available();
    if (!available) {
      return [false, "Platform adapter not available"];
    }
    try {
      const client = new SystemInfoClient(this.base_url);
      const info = client.get_system_info();
      return [true, `Platform: ${info.platform} ${info.arch}`];
    } catch (error) {
      return [false, `Platform info check failed: ${error instanceof Error ? error.message : String(error)}`];
    }
  }

  check_all(test_endpoints: boolean = true): Record<string, HealthStatus> {
    const checks = [
      { name: 'screenshot', fn: () => this.check_screenshot() },
      { name: 'cursor_position', fn: () => this.check_cursor_position() },
      { name: 'screen_size', fn: () => this.check_screen_size() },
      { name: 'shell_command', fn: () => this.check_shell_command() },
      { name: 'python_execution', fn: () => this.check_python_execution() },
      { name: 'bash_script', fn: () => this.check_bash_script() },
      { name: 'file_operations', fn: () => this.check_file_operations() },
      { name: 'desktop_path', fn: () => this.check_desktop_path() },
      { name: 'window_management', fn: () => this.check_window_management() },
      { name: 'recording', fn: () => this.check_recording() },
      { name: 'accessibility', fn: () => this.check_accessibility() },
      { name: 'platform_info', fn: () => this.check_platform_info() },
    ];

    if (test_endpoints) {
      checks.push({ name: 'health_endpoint', fn: () => this.check_health_endpoint() });
    }

    for (const check of checks) {
      const [success, detail] = check.fn();
      const featureAvailable = (this.feature_checker as unknown as Record<string, () => boolean>)[`check_${check.name}_available`]?.() ?? success;
      const status = new HealthStatus(
        featureAvailable,
        success,
        detail
      );
      this.results[check.name] = status;
    }

    if (this.auto_cleanup) {
      this.cleanup_temp_files();
    }

    return { ...this.results };
  }

  print_results(results: Record<string, HealthStatus> | null = null, show_endpoint_details: boolean = false): void {
    const toPrint = results ?? this.results;
    const logger = Logger.instance.get_logger('HealthChecker');
    
    for (const [name, status] of Object.entries(toPrint)) {
      const statusText = status.fully_available() ? '✓' : '✗';
      logger.info(`${statusText} ${name}: ${status.endpoint_detail}`);
      if (show_endpoint_details && status.endpoint_detail) {
        logger.info(`  Detail: ${status.endpoint_detail}`);
      }
    }
  }

  get_summary(): Record<string, unknown> {
    const total = Object.keys(this.results).length;
    const passed = Object.values(this.results).filter(s => s.fully_available()).length;
    return {
      total_checks: total,
      passed: passed,
      failed: total - passed,
      pass_rate: total > 0 ? Math.round((passed / total) * 100) : 0,
    };
  }

  get_simple_features_dict(): Record<string, boolean> {
    return this.feature_checker.check_all_features();
  }
}
