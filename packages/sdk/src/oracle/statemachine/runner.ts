import assert from "assert";
import type { Context, StateMachines } from "./types";
import GenericStore, { Emit as GenericEmit } from "../store/store";
import uid from "lodash/uniqueId";
export type State = {
  done: Record<string, Context<any>>;
  pending: Record<string, Context<any>>;
};
export type Store = GenericStore<State>;
export type Emit = GenericEmit<State>;

export default class Runner {
  private store: Store;
  constructor(private statemachines: StateMachines, emit: Emit) {
    this.store = new GenericStore<State>(emit, { done: {}, pending: {} });
  }
  moveToDone(state: State, context: Context<any>) {
    delete state.pending[context.id];
    state.done[context.id] = context;
  }
  shouldProcess(context: Context<any>, now: number): boolean {
    if (!context?.interval) return true;
    return now - context.updated >= context.interval;
  }
  hasPending(): boolean {
    return Object.values(this.store.read().pending).length > 0;
  }
  async process(context: Context<any>, now: number): Promise<Context<any>> {
    assert(!context.done, "Context has ended");
    assert(this.statemachines[context.type], "No statemachine for type: " + context.type);
    const sm = this.statemachines[context.type];
    try {
      const state = await sm?.[context.state]?.(context.params);
      if (state) context.state = state;
      if (state === "done") context.done = true;
    } catch (err) {
      context.error = err as Error;
      context.state = "error";
      context.done = true;
    }
    context.updated = now;
    return context;
  }
  async tick(now = Date.now()): Promise<boolean> {
    await this.store.writeAsync(async (w) => {
      for (const context of Object.values(w.pending)) {
        if (this.shouldProcess(context, now)) {
          const next = await this.process(context, now);
          if (next.done) this.moveToDone(w, next);
        }
      }
    });
    return this.hasPending();
  }
  create<P>(type: string, params: P, id: string = uid(), now = Date.now()): void {
    const context: Context<P> = {
      id,
      state: "start",
      done: false,
      created: now,
      updated: now,
      type,
      params,
    };
    this.store.write((w) => {
      w.pending[context.id] = context;
    });
  }
}
