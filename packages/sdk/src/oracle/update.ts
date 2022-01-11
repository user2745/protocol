import { Inputs } from "./types/state";
import Store from "./store";
import * as services from "./services";
export default class Update {
  private read: Store["read"];
  private write: Store["write"];
  constructor(private store: Store) {
    this.read = store.read;
    this.write = store.write;
  }
  async allowance(params: { chainId: number; account: string; spender: string; currency: string }) {
    const { chainId, account, spender, currency } = params;
    const provider = this.read().provider();
    const erc20 = services.erc20.factory(provider, currency);
    const allowance = await erc20.contract.allowance(account, spender);
    this.write((write) => write.chains(chainId).erc20s(currency).allowance(account, spender, allowance));
  }
  async balance(params: { chainId: number; account: string; currency: string }) {
    const { chainId, account, currency } = params;
    const provider = this.read().provider();
    const erc20 = services.erc20.factory(provider, currency);
    const result = await erc20.contract.balanceOf(account);
    this.write((write) => write.chains(chainId).erc20s(currency).balance(account, result));
  }
  async erc20(params: { chainId: number; address: string }) {
    const { chainId, address } = params;
    const provider = this.read().provider();
    const erc20 = services.erc20.factory(provider, address);
    const props = await erc20.getProps();
    this.write((write) => write.chains(chainId).erc20s(address).props(props));
  }
  async request(params: Inputs["request"]) {
    const { requester, identifier, timestamp, ancillaryData, chainId } = params;
    const oracleAddress = this.store.read().oracleAddress();
    const provider = this.read().provider();
    const oo = new services.optimisticOracle.OptimisticOracle(provider, oracleAddress);
    const request = await oo.getRequest(requester, identifier, timestamp, ancillaryData);
    const state = await oo.getState(requester, identifier, timestamp, ancillaryData);
    this.write((write) => {
      write
        .chains(chainId)
        .optimisticOracle()
        .request(params, { ...request, state });
    });
  }
  async oracle(chainId: number) {
    const oracleAddress = this.store.read().oracleAddress();
    const provider = this.read().provider();
    const oo = new services.optimisticOracle.OptimisticOracle(provider, oracleAddress);
    const { defaultLiveness } = await oo.getProps();
    this.write((write) => write.chains(chainId).optimisticOracle().defaultLiveness(defaultLiveness));
  }
}
