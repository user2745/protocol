export type Context<Params> = {
  id: string;
  state: string;
  done: boolean;
  created: number;
  updated: number;
  type: string;
  error?: Error;
  interval?: number;
  params?: Params;
};
export type StateMachine = Record<string, (context: Context) => string | undefined>;
export type StateMachines = Record<string, Handler>;
