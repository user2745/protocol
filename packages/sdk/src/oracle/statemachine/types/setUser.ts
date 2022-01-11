import Update from "../../update";
import Store from "../../store";
import { Signer } from "../../types/ethers";
import { original } from "immer";

export type Params = {
  chainId: number;
  signer: Signer;
  address: string;
};

export function handler(store: Store) {
  const update = new Update(store);
  return {
    async start(params: Params) {
      const unwrap = original(params);
      store.write((write) => unwrap && write.user().set(unwrap));

      const request = store.read().request();
      await update.balance({ account: params.address, chainId: params.chainId, currency: request.currency });

      const oracleAddress = store.read().oracleAddress();
      await update.allowance({
        spender: oracleAddress,
        account: params.address,
        currency: request.currency,
        chainId: params.chainId,
      });

      return "done";
    },
  };
}
