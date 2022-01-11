import Update from "../../update";
import Store from "../../store";
import { Inputs } from "../../types/state";
export type Params = Inputs["request"];

export function handler(store: Store) {
  const update = new Update(store);
  return {
    async start(params: Params) {
      const { requester, identifier, timestamp, ancillaryData, chainId } = params;
      store.write((write) => write.inputs().request(requester, identifier, timestamp, ancillaryData, chainId));

      await update.request(params);
      await update.oracle(params.chainId);

      const user = store.read().userAddress();
      const oracleAddress = store.read().oracleAddress();
      const request = store.read().request();

      await update.erc20({ address: request.currency, chainId });
      await update.allowance({ spender: oracleAddress, account: user, currency: request.currency, chainId });
      await update.balance({ account: user, currency: request.currency, chainId });

      return "done";
    },
  };
}
