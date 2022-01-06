import assert from "assert";
import Store, { Emit } from "./store";
import type { state } from "./types";
import { Inputs } from "./types/state";
import { Signer } from "./types/ethers";
import * as utils from "./utils";
import { loop } from "../utils";

export class Client {
  public readonly update: Update;
  private intervalStarted = false;
  constructor(public readonly store: Store) {
    this.update = new Update(store);
  }
  setUser(address: string, chainId: number, signer: Signer): void {
    this.store.write((write) => write.user().set({ address, chainId, signer }));
  }
  setActiveRequest(params: Inputs["request"]): void {
    const { requester, identifier, timestamp, ancillaryData, chainId } = params;
    this.store.write((write) => write.inputs().request(requester, identifier, timestamp, ancillaryData, chainId));
  }
  previewProposal() {
    return utils.previewProposal(this.store.get());
  }
  // starts transaction checking intervals, defaults to 30 seconds
  startInterval(delayMs = 30000) {
    assert(!this.intervalStarted, "Interval already started, try stopping first");
    this.intervalStarted = true;
    const manager = this.store.read().transactionService();
    loop(async () => {
      assert(this.intervalStarted, "Interval Stopped");
      await manager.processRequests();
      await manager.processSubmitted();
    }, delayMs).catch((err) => {
      this.store.write((w) => w.error(err));
    });
  }
  // starts transaction checking intervals
  stopInterval() {
    this.intervalStarted = false;
  }
}

export class Update {
  private read: Store["read"];
  private write: Store["write"];
  constructor(private store: Store) {
    this.read = store.read;
    this.write = store.write;
  }
  async all() {
    await this.oracle();
    await this.request();
    await this.collateralProps();
    await this.userCollateralBalance();
    await this.oracleAllowance();
  }
  async request() {
    const request = this.read().inputRequest();
    const chainId = request.chainId;
    const oo = this.read().oracleService();
    const fullRequest = await oo.getRequest(
      request.requester,
      request.identifier,
      request.timestamp,
      request.ancillaryData
    );
    const state = await oo.getState(request.requester, request.identifier, request.timestamp, request.ancillaryData);
    this.write((write) => {
      // create the erc20 service to handle currency
      write.services(chainId).erc20s(fullRequest.currency);
      write
        .chains(chainId)
        .optimisticOracle()
        .request(request, { ...fullRequest, state });
    });
  }
  async oracle() {
    const chainId = this.read().requestChainId();
    const oo = this.read().oracleService();
    const { defaultLiveness } = await oo.getProps();
    this.write((write) => write.chains(chainId).optimisticOracle().defaultLiveness(defaultLiveness));
  }
  async userCollateralBalance() {
    const chainId = this.read().requestChainId();
    const account = this.read().userAddress();
    const token = this.read().collateralService();
    const result = await token.contract.balanceOf(account);
    this.write((write) => write.chains(chainId).erc20s(token.address).balance(account, result));
  }
  async collateralProps() {
    const chainId = this.read().requestChainId();
    const token = this.read().collateralService();
    const props = await token.getProps();
    this.write((write) => write.chains(chainId).erc20s(token.address).props(props));
  }
  async oracleAllowance() {
    const chainId = this.read().requestChainId();
    const account = this.read().userAddress();
    const oracleAddress = this.read().oracleAddress();
    const token = this.read().collateralService();
    const result = await token.contract.allowance(account, oracleAddress);
    this.write((write) => write.chains(chainId).erc20s(token.address).allowance(account, oracleAddress, result));
  }
}

export default function factory(config: state.Config, emit: Emit): Client {
  const store = new Store(emit);
  // store transaction updates to the global store
  function transactionHandler(transaction: state.Transaction) {
    store.write((w) => w.transactions(transaction));
  }
  store.write((write) => {
    write.config(config);
    for (const chain of Object.values(config.chains)) {
      write.chains(chain.chainId).optimisticOracle().address(chain.optimisticOracleAddress);
      write.services(chain.chainId).provider(chain.providerUrl);
      write.services(chain.chainId).multicall2(chain.multicall2Address);
      write.services(chain.chainId).optimisticOracle(chain.optimisticOracleAddress);
      // transaction manager needs to write to store
      write
        .services(chain.chainId)
        .transactionManager({ confirmations: chain.confirmations, chainId: chain.chainId }, transactionHandler);
    }
  });
  return new Client(store);
}
