import assert from "assert";
import Sm, { State } from "../statemachine";

const handlers = {
  test1: {
    start() {
      return "two";
    },
    two() {
      return "three";
    },
    three() {
      return "done";
    },
  },
  test2: {
    start() {
      throw new Error("fail");
    },
  },
};
describe("Oracle Statemachine", () => {
  let sm: Sm;
  let state: State;
  beforeAll(() => {
    sm = new Sm(handlers, (next: State) => {
      state = next;
    });
  });
  describe("test1", () => {
    test("create", () => {
      sm.create("test1", undefined, "a", 1);
      assert.ok(state.pending.a);
    });
    test("tick", async () => {
      await sm.tick();
      assert.ok(state.pending.a);
      assert.equal(state.pending.a.state, "two");
      assert.equal(state.pending.a.done, false);
    });
    test("tick", async () => {
      await sm.tick();
      assert.equal(state.pending.a.state, "three");
      assert.equal(state.pending.a.done, false);
    });
    test("tick", async () => {
      await sm.tick();
      assert.equal(state.done.a.state, "done");
      assert.equal(state.done.a.done, true);
    });
  });
  describe("test1", () => {
    test("create", () => {
      sm.create("test2", undefined, "b", 1);
      assert.ok(state.pending.b);
    });
    test("tick", async () => {
      await sm.tick();
      assert.ok(state.done.b);
      assert.equal(state.done.b.done, true);
      assert.equal(state.done.b.state, "error");
      assert.ok(state.done.b.error, "error");
    });
  });
});
