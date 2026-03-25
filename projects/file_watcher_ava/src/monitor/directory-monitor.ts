import { Event, EventEmitter } from './event/index';
import { GlobFilter } from '../filter/index';
import { FileEvent } from './event/file-event';

type DirectoryMonitor = {
  readonly includePatterns: ReadonlyArray<string>;
  readonly excludePatterns: ReadonlyArray<string>;
};

class  DirectoryMonitor {
  private readonly path: string;
  private readonly emitter: Event;
  private  Map: Map<string, File> read
}
