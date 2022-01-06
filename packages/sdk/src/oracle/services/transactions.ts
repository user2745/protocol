import { Provider } from "../types/ethers";
import { Transaction } from "../types/state";

export type Config = {
  confirmations?: number;
  chainId: number;
};
export type Emit = (data: Transaction) => void;

// single chain transaction manager for multiple signers
export class Manager {
  requested = new Map<string, Transaction>();
  submitted = new Map<string, Transaction>();
  confirmed = new Map<string, Transaction>();
  errored = new Map<string, Transaction>();
  constructor(private config: Config, private provider: Provider, private emit: Emit) {
    this.config.confirmations = this.config.confirmations || 1;
  }
  create(id: string, data: Pick<Transaction, "signer" | "request">): void {
    const transaction: Transaction = {
      ...data,
      id,
      chainId: this.config.chainId,
      created: Date.now(),
      state: "requested" as const,
    };
    this.requested.set(id, transaction);
    this.emit(transaction);
  }
  async processRequest(id: string): Promise<void> {
    const transaction = this.requested.get(id);
    if (!transaction) return;
    this.requested.delete(id);
    let update: Transaction;
    try {
      const sent = await transaction.signer.sendTransaction(transaction.request);
      update = { ...transaction, hash: sent.hash, state: "submitted" as const };
      this.submitted.set(id, update);
    } catch (err) {
      update = { ...transaction, error: err, state: "error" as const };
      this.errored.set(id, update);
    }
    this.emit(update);
  }
  async processRequests(): Promise<void> {
    for (const id in this.requested.keys()) {
      await this.processRequest(id);
    }
  }
  async processSubmission(id: string): Promise<void> {
    const transaction = this.submitted.get(id);
    if (!transaction) return;
    if (!transaction.hash) return;
    const receipt = await this.provider.getTransactionReceipt(transaction.hash).catch(() => undefined);
    if (!receipt) return;
    if (this.config.confirmations && receipt.confirmations < this.config.confirmations) return;
    this.submitted.delete(id);
    const update = { ...transaction, state: "confirmed" as const };
    this.confirmed.set(id, update);
    this.emit(update);
  }
  async processSubmitted(): Promise<void> {
    for (const id in this.submitted.keys()) {
      await this.processSubmission(id);
    }
  }
}
