import { createContext, useContext } from "react";
import type { AuthSessionState } from "../api/authClient";

export const AuthSessionContext = createContext<AuthSessionState>({ status: "checking" });

export function useAuthSessionContext(): AuthSessionState {
  return useContext(AuthSessionContext);
}
