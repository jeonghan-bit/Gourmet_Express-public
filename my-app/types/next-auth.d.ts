// types/next-auth.d.ts
import "next-auth";
import NextAuth from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    role: string;
    isVerified: boolean;
    isNewUser?: boolean;
    phoneNumber: string;
    firebaseToken?: string;
  }

  interface Session {
    user: User 
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    phoneNumber?: string;
    role: string;
    isVerified?: boolean;
    isNewUser?: boolean;
    firebaseToken?: string;
  }
}
