import Runner, { Emit } from "./runner";
import Types from "./types/index";

import Store from "../store";
export { Runner, Types };

export default function factory(store: Store, emit: Emit): Runner {
  const statemachines = Types(store);
  return new Runner(statemachines, emit);
}
