import { BandEvent } from './events';

export class EventStore {
  private events: BandEvent[] = [];

  constructor(initialEvents: BandEvent[] = []) {
    this.events = [...initialEvents];
  }

  append(event: BandEvent): void {
    this.events.push(event);
  }

  getAll(): BandEvent[] {
    return [...this.events];
  }

  getUpTo(eventId: string): BandEvent[] {
    const index = this.events.findIndex((e) => e.id === eventId);
    if (index === -1) {
      return this.getAll();
    }
    return this.events.slice(0, index + 1);
  }

  serialize(): string {
    return JSON.stringify(this.events);
  }

  static deserialize(data: string): EventStore {
    const events = JSON.parse(data) as BandEvent[];
    return new EventStore(events);
  }
}
