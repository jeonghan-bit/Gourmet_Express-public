import { db, users } from "@/lib/db";
import { normalizeCanadianPhoneNumber } from "@/lib/utils";
import { eq, sql } from "drizzle-orm";
import admin from "firebase-admin";
import CredentialsProvider from "next-auth/providers/credentials";

// Ensure Firebase Admin is initialized only once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Phone",
      credentials: {
        phoneNumber: { label: "Phone Number", type: "text" },
        firebaseToken: { label: "Firebase Token", type: "text" },
      },
      async authorize(credentials) {
        const submittedPhone = normalizeCanadianPhoneNumber(credentials?.phoneNumber);
        const firebaseToken = credentials?.firebaseToken;
        if (!submittedPhone || !firebaseToken) return null;

        let verifiedPhone: string | null = null;
        try {
          const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
          verifiedPhone = normalizeCanadianPhoneNumber(decodedToken.phone_number);
        } catch (error) {
          console.error("Firebase token verification failed:", error);
          return null;
        }

        if (!verifiedPhone || verifiedPhone !== submittedPhone) return null;

        const digits = verifiedPhone;

        const existingCI = await db
          .select({ id: users.id, phoneNumber: users.phoneNumber })
          .from(users)
          .where(
            sql`regexp_replace(coalesce(${users.phoneNumber}, ''), '[^0-9]', '', 'g') in (${digits}, ${`1${digits}`})`
          )
          .orderBy(sql`case when ${users.phoneNumber} = ${digits} then 0 else 1 end`);

        let userId: number;
        let role = "customer";

        if (existingCI.length > 0) {
          // found a user → reuse
          userId = existingCI[0].id;

          // fetch their email (if any) and role
          const [u] = await db
            .select({ role: users.role })
            .from(users)
            .where(eq(users.id, userId));
          if (u?.role) role = u.role;

          if (existingCI.length === 1 && existingCI[0].phoneNumber !== digits) {
            await db
              .update(users)
              .set({ phoneNumber: digits, updatedAt: new Date().toISOString() })
              .where(eq(users.id, userId));
          }

          // 4) NextAuth User object: must have id & email; name can be email or fallback to phone
          return {
            id: userId.toString(),
            phoneNumber: digits,
            isVerified: true,
            isNewUser: false,
            role,
          };
        } else {
          // first-time phone user → create both rows
          const [ins] = await db
            .insert(users)
            .values({
              name: `Phone User ${digits.slice(-4)}`,
              phoneNumber: digits,
              role: "customer",
              isVerified: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })
            .returning({ id: users.id });

          userId = ins.id;

          // 4) NextAuth User object: must have id & email; name can be email or fallback to phone
          return {
            id: userId.toString(),
            phoneNumber: digits,
            isVerified: true,
            isNewUser: true,
            role: "customer",
          };
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        // Only update token when user data is available (first sign in)
        token.id = user.id;
        token.isVerified = user.isVerified;
        token.isNewUser = user.isNewUser;
        token.role = user.role;
        token.phoneNumber = user.phoneNumber;
      }

      return token;
    },
    async session({ session, token }: any) {
      session.user.id = token.id as string;
      session.user.isVerified = token.isVerified;
      session.user.isNewUser = token.isNewUser;
      session.user.role = token.role;
      session.user.phoneNumber = token.phoneNumber;
      if (token.role === "admin") {
        session.user.firebaseToken = token.firebaseToken;
      }
      return session;
    },
    async redirect({ url, baseUrl }: any) {
      // Allow relative URLs or same-origin absolute URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        if (new URL(url).origin === baseUrl) return url;
      } catch {
        return baseUrl;
      }
      return baseUrl;
    },
  },
  pages: {
    signIn: "/signin",
  },
};
