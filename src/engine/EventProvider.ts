export type EventCallback = (data: any) => void;

export class EventProvider {
  events: Record<string, EventCallback[]> = {};
  private bindEvents = false;

  constructor(bindEvents = true) {
    this.bindEvents = bindEvents;
  }

  on(type: string, cb: EventCallback) {
    if (!this.events[type]) {
      this.events[type] = [];
    }

    if (this.bindEvents) {
      this.events[type].push(cb.bind(this));
    } else {
      this.events[type].push(cb);
    }
  }

  off(type: string, cb: EventCallback) {
    this.events[type] = this.events[type].filter(ecb => ecb !== cb);
  }

  trigger(type: string, data: any) {
    this.events[type]?.forEach(cb => cb(data));
  }
}
