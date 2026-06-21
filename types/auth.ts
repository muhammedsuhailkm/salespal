import type { DefaultSession } from "next-auth";
import type { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface User {
    role_id: number;
    org_ids?: number[];
    manager_ids?: number[];
  }

  interface Session {
    user: {
      id: number;
      role_id: number;
      org_ids: number[];
      manager_ids: number[];
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: number;
    role_id: number;
    org_ids: number[];
    manager_ids: number[];
  }
}

export type SalesPalSessionUser = DefaultSession["user"] & {
  id: number;
  role_id: number;
  org_ids: number[];
  manager_ids: number[];
};

export type SalesPalJwt = JWT;
