import * as setUser from "./setUser";
import * as setRequest from "./setRequest";
import Store from "../../store";

enum Type {
  setUser = "setUser",
  setRequest = "setRequest",
}
export default function factory(store: Store) {
  return {
    [Type.setUser]: setUser.handler(store),
    [Type.setRequest]: setRequest.handler(store),
  };
}
