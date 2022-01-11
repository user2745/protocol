import Update from "../../update";
type Params = {
  currency: string;
  chainId: number;
  signer: Signer;
  account: string;
  spender: string;
  amount: string;
  hash?: string;
  confirmations: number;
};

export default (store): Handler => {
  const update = new Update(store);
  return {
    async start(params: Params): string | undefined {
      const { chainId, currency, spender, amount } = params;
      store.write((w) => w.services(chainId).erc20s(currency));
      const erc20 = store.read().erc20Service(chainId, currency);
      const tx = await erc20.contract.allowance(spender, amount);
      params.hash = tx.hash;
      return "confirm";
    },
    async confirm(params: Params): string | undefined {
      const { hash, confirmations } = params;
      if (await isConfirmed(hash, confirmations)) {
        await update.allowance(params);
        return "finalize";
      }
    },
  };
};
