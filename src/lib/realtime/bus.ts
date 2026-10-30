export type RealtimeEventType = "complaint.created" | "complaint.updated" | "comment.added";

export interface RealtimeEvent {
  type: RealtimeEventType;
  complaintId: string;
  publicVisible: boolean;
  at: string; // ISO
}

export interface EventFilter {
  complaintId?: string;
  publicVisibleOnly?: boolean;
}

export type EventHandler = (event: RealtimeEvent) => void;

export class ListenerLimitError extends Error {
  constructor(message = "Maximum realtime event listeners exceeded") {
    super(message);
    this.name = "ListenerLimitError";
  }
}

interface Subscription {
  id: number;
  filter?: EventFilter | null;
  handler: EventHandler;
}

const MAX_LISTENERS = 200;

export class EventBus {
  private subscriptions = new Map<number, Subscription>();
  private nextId = 1;

  publish(event: RealtimeEvent): void {
    const list = Array.from(this.subscriptions.values());
    for (const sub of list) {
      if (sub.filter?.complaintId && sub.filter.complaintId !== event.complaintId) {
        continue;
      }
      if (sub.filter?.publicVisibleOnly && !event.publicVisible) {
        continue;
      }
      try {
        sub.handler(event);
      } catch (err) {
        console.error("Error in realtime event handler:", err);
      }
    }
  }

  subscribe(filter: EventFilter | null | undefined, handler: EventHandler): () => void {
    if (this.subscriptions.size >= MAX_LISTENERS) {
      throw new ListenerLimitError();
    }

    const id = this.nextId++;
    this.subscriptions.set(id, { id, filter, handler });

    return () => {
      this.subscriptions.delete(id);
    };
  }

  listenerCount(): number {
    return this.subscriptions.size;
  }

  reset(): void {
    this.subscriptions.clear();
    this.nextId = 1;
  }
}

interface GlobalWithBus {
  __realtimeEventBus?: EventBus;
}

const globalWithBus = globalThis as GlobalWithBus;

export const eventBus: EventBus =
  globalWithBus.__realtimeEventBus ?? (globalWithBus.__realtimeEventBus = new EventBus());
