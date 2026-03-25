import { GameEvent, GameEventMap } from '../core/types';

/** Callback signature for an event listener. */
export type EventListener<T> = (payload: T) => void;

/**
 * A strongly-typed event bus for decoupling game subsystems.
 *
 * Events and their payload types are defined in {@link GameEventMap}.
 *
 * @example
 * ```ts
 * const bus = new EventBus();
 * bus.on(GameEvent.ScoreChange, ({ score }) => console.log(score));
 * bus.emit(GameEvent.ScoreChange, { score: 100, highScore: 200 });
 * ```
 */
export class EventBus {
  private readonly listeners: Map<string, Set<EventListener<any>>>;

  constructor() {
    this.listeners = new Map();
  }

  /**
   * Subscribe to a typed game event.
   * @param event - The event to listen for.
   * @param listener - The callback to invoke when the event fires.
   * @returns An unsubscribe function.
   */
  on<E extends GameEvent>(
    event: E,
    listener: EventListener<GameEventMap[E]>,
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    const set = this.listeners.get(event)!;
    set.add(listener);

    return () => {
      set.delete(listener);
    };
  }

  /**
   * Subscribe to an event for a single firing, then auto-unsubscribe.
   * @param event - The event to listen for.
   * @param listener - The callback to invoke once.
   * @returns An unsubscribe function (can be called early to cancel).
   */
  once<E extends GameEvent>(
    event: E,
    listener: EventListener<GameEventMap[E]>,
  ): () => void {
    const unsubscribe = this.on(event, (payload) => {
      unsubscribe();
      listener(payload);
    });
    return unsubscribe;
  }

  /**
   * Emit an event, invoking all registered listeners synchronously.
   * @param event - The event to fire.
   * @param payload - The data to pass to each listener.
   */
  emit<E extends GameEvent>(event: E, payload: GameEventMap[E]): void {
    const set = this.listeners.get(event);
    if (!set) return;

    for (const listener of set) {
      listener(payload);
    }
  }

  /**
   * Remove all listeners for a specific event, or all events if none specified.
   * @param event - (Optional) The event to clear.
   */
  clear(event?: GameEvent): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Get the number of listeners registered for an event.
   * @param event - The event to check.
   * @returns The listener count.
   */
  listenerCount(event: GameEvent): number {
    return this.listeners.get(event)?.size ?? 0;
  }
}
