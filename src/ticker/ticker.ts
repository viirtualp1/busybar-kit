export const TICKER_MS = 7000;

/** The only thing the ticker needs to know about an app's events. */
export type Prioritised = { priority: number };

export type ActiveTicker<TEvent extends Prioritised> = {
  event: TEvent;
  elapsedMs: number;
};

/**
 * Holds one event on screen for a while, and lets a more important one cut in.
 */
export class EventTicker<TEvent extends Prioritised> {
  private event: TEvent | null = null;
  private startedAt = 0;
  private until = 0;

  constructor(private readonly durationMs = TICKER_MS) {}

  push(event: TEvent | null, nowMs: number) {
    if (!event) {
      return false;
    }
    const showing = this.active(nowMs);
    if (showing && event.priority <= showing.event.priority) {
      return false;
    }
    this.event = event;
    this.startedAt = nowMs;
    this.until = nowMs + this.durationMs;
    return true;
  }

  active(nowMs: number): ActiveTicker<TEvent> | null {
    if (nowMs >= this.until || !this.event) {
      return null;
    }

    return { event: this.event, elapsedMs: nowMs - this.startedAt };
  }
}
