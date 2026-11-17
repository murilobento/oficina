import { adminClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/** Cliente do Better Auth. A API fica no mesmo endereço do site, em /api/auth. */
export const authClient = createAuthClient({
  baseURL: typeof window === "undefined" ? "http://localhost:5173" : window.location.origin,
  plugins: [adminClient()],
});
