import { EventEmitter } from "events";

const eventBus = new EventEmitter();

export const emitEvent = (type, payload) => {
  eventBus.emit("event", { type, payload, ts: new Date().toISOString() });
};

export const onEvent = (handler) => {
  eventBus.on("event", handler);
  return () => eventBus.off("event", handler);
};

export default eventBus;
