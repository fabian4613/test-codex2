import NextAuth, { type NextAuthOptions } from "next-auth";
import KeycloakProvider from "next-auth/providers/keycloak";
import { jwtDecode } from "jwt-decode";
export { isAdminGroup } from "@/lib/auth-util";

export type Me = {
  authenticated: boolean;
  sub?: string;
  name?: string | null;
  email?: string | null;
  groups?: string[];
};

function getProviders() {
  const { KEYCLOAK_ISSUER, KEYCLOAK_CLIENT_ID, KEYCLOAK_CLIENT_SECRET } = process.env;
  if (!KEYCLOAK_ISSUER || !KEYCLOAK_CLIENT_ID || !KEYCLOAK_CLIENT_SECRET) return [];
  return [
    KeycloakProvider({
      clientId: KEYCLOAK_CLIENT_ID,
      clientSecret: KEYCLOAK_CLIENT_SECRET,
      issuer: KEYCLOAK_ISSUER
      // Do not override scope; rely on default client scopes and server fallbacks
    }),
  ];
}

export const authEnabled = () => getProviders().length > 0;

export const authOptions: NextAuthOptions = {
  providers: getProviders(),
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, account }) {
      // On first sign-in, enrich token with groups from id/access token
      if (account && (account as any).id_token) {
        try {
          const decoded: any = jwtDecode((account as any).id_token);
          const groups: string[] = decoded.groups || decoded["realm_access"]?.roles || [];
          if (Array.isArray(groups)) (token as any).groups = groups;
        } catch {
          // ignore
        }
      } else if (account && (account as any).access_token) {
        try {
          const decoded: any = jwtDecode((account as any).access_token);
          const groups: string[] = decoded.groups || decoded["realm_access"]?.roles || [];
          if (Array.isArray(groups)) (token as any).groups = groups;
        } catch {}
      }
      // Persist access token for server-side probes (userinfo)
      if (account && (account as any).access_token) {
        (token as any).accessToken = (account as any).access_token;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).sub = token.sub;
      (session as any).groups = (token as any).groups || [];
      (session as any).accessToken = (token as any).accessToken;
      return session;
    },
  },
};

export const { handlers: authHandlers } = NextAuth(authOptions);

// isAdminGroup re-exported from auth-util for server modules
