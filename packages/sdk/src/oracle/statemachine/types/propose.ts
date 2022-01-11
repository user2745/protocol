import { isConfirmed } from "../../utils";
export type Params = {
  account: string;
  hash?: string;
  confirmations: number;
};

import Update from "../update";

export default (store) => {
  const update = new Update(store);
  return {
    async start(params: Params) {
      const oracle = store.read().Oracle();
      const tx = await oracle.propose();
      params.hash = tx.hash;
      params.state = "confirm";
    },
    async confirm(params: Params) {
      if (await isConfirmed(params.hash, params.confirmations)) {
        update.userCollateralBalance();
        update.request();
        return "done";
      }
    },
  };
};
