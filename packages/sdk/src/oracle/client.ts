import assert from "assert";
import Store, { Emit } from "./store";
import type { state } from "./types";
import { Inputs } from "./types/state";
import { Signer } from "./types/ethers";
import * as utils from "./utils";
import { loop } from "../utils";
import StateMachine, { Runner } from "./statemachine";

export class Client {
  private intervalStarted = false;
  private sm: Runner;
  constructor(public readonly store: Store) {
    this.sm = StateMachine(store, (state) => console.log(state));
  }
  setUser(address: string, chainId: number, signer: Signer): void {
    this.sm.create("setUser", { address, chainId, signer });
  }
  setActiveRequest(params: Inputs["request"]): void {
    this.sm.create("setRequest", params);
  }
  previewProposal() {
    return utils.previewProposal(this.store.get());
  }
  async update() {
    return this.sm.tick();
  }
  // starts transaction checking intervals, defaults to 30 seconds
  startInterval(delayMs = 30000) {
    assert(!this.intervalStarted, "Interval already started, try stopping first");
    this.intervalStarted = true;
    loop(async () => {
      assert(this.intervalStarted, "Interval Stopped");
      this.sm.tick();
    }, delayMs).catch((err) => {
      this.intervalStarted = false;
      this.store.write((w) => w.error(err));
    });
  }
  // starts transaction checking intervals
  stopInterval() {
    this.intervalStarted = false;
  }
}

export default function factory(config: state.Config, emit: Emit): Client {
  const store = new Store(emit);
  store.write((write) => {
    write.config(config);
    for (const chain of Object.values(config.chains)) {
      write.chains(chain.chainId).optimisticOracle().address(chain.optimisticOracleAddress);
      write.services(chain.chainId).provider(chain.providerUrl);
      write.services(chain.chainId).multicall2(chain.multicall2Address);
    }
  });
  return new Client(store);
}
