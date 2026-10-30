import { describe, it, expect, beforeEach, vi } from "vitest";
import { EventBus, ListenerLimitError, type RealtimeEvent } from "@/lib/realtime/bus";

describe("EventBus Unit Tests", () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  it("subscribes, receives published events, and unsubscribes cleanly", () => {
    const received: RealtimeEvent[] = [];
    const unsubscribe = bus.subscribe(undefined, (event) => {
      received.push(event);
    });

    expect(bus.listenerCount()).toBe(1);

    const event1: RealtimeEvent = {
      type: "complaint.created",
      complaintId: "cmp-1",
      publicVisible: false,
      at: new Date().toISOString(),
    };
    bus.publish(event1);

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual(event1);

    unsubscribe();
    expect(bus.listenerCount()).toBe(0);

    bus.publish({
      type: "complaint.updated",
      complaintId: "cmp-1",
      publicVisible: true,
      at: new Date().toISOString(),
    });

    // Still 1 because unsubscribed
    expect(received).toHaveLength(1);
  });

  it("filters events by complaintId and publicVisibleOnly", () => {
    const specificComplaintEvents: RealtimeEvent[] = [];
    const publicOnlyEvents: RealtimeEvent[] = [];

    bus.subscribe({ complaintId: "target-cmp" }, (event) => {
      specificComplaintEvents.push(event);
    });

    bus.subscribe({ publicVisibleOnly: true }, (event) => {
      publicOnlyEvents.push(event);
    });

    // 1. Target complaint, internal
    bus.publish({
      type: "comment.added",
      complaintId: "target-cmp",
      publicVisible: false,
      at: new Date().toISOString(),
    });

    // 2. Other complaint, public
    bus.publish({
      type: "complaint.updated",
      complaintId: "other-cmp",
      publicVisible: true,
      at: new Date().toISOString(),
    });

    // 3. Target complaint, public
    bus.publish({
      type: "complaint.updated",
      complaintId: "target-cmp",
      publicVisible: true,
      at: new Date().toISOString(),
    });

    expect(specificComplaintEvents).toHaveLength(2);
    expect(specificComplaintEvents.map((e) => e.complaintId)).toEqual(["target-cmp", "target-cmp"]);

    expect(publicOnlyEvents).toHaveLength(2);
    expect(publicOnlyEvents.every((e) => e.publicVisible)).toBe(true);
  });

  it("isolates throwing handlers so other subscribers still receive events", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const received: RealtimeEvent[] = [];

    bus.subscribe(undefined, () => {
      throw new Error("Deliberate subscriber failure");
    });

    bus.subscribe(undefined, (event) => {
      received.push(event);
    });

    const event: RealtimeEvent = {
      type: "complaint.created",
      complaintId: "cmp-test",
      publicVisible: true,
      at: new Date().toISOString(),
    };

    expect(() => bus.publish(event)).not.toThrow();
    expect(received).toHaveLength(1);
    expect(received[0]).toEqual(event);

    consoleErrorSpy.mockRestore();
  });

  it("caps total listeners at 200 and throws ListenerLimitError beyond that", () => {
    const unsubs: Array<() => void> = [];

    for (let i = 0; i < 200; i++) {
      unsubs.push(bus.subscribe(undefined, () => {}));
    }

    expect(bus.listenerCount()).toBe(200);

    expect(() => bus.subscribe(undefined, () => {})).toThrow(ListenerLimitError);

    // Unsubscribing frees slots
    unsubs[0]();
    expect(bus.listenerCount()).toBe(199);

    expect(() => bus.subscribe(undefined, () => {})).not.toThrow();
    expect(bus.listenerCount()).toBe(200);
  });
});
