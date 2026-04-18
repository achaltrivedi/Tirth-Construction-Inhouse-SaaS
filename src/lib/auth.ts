import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import { compareSync } from "bcryptjs";
import { logger } from "@/lib/logger";

const loginAttempts = new Map<string, { count: number; firstAttemptAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function isRateLimited(email: string) {
    const now = Date.now();
    const entry = loginAttempts.get(email);

    if (!entry) return false;

    if (now - entry.firstAttemptAt > WINDOW_MS) {
        loginAttempts.delete(email);
        return false;
    }

    return entry.count >= MAX_ATTEMPTS;
}

function recordFailedAttempt(email: string) {
    const now = Date.now();
    const entry = loginAttempts.get(email);

    if (!entry || now - entry.firstAttemptAt > WINDOW_MS) {
        loginAttempts.set(email, { count: 1, firstAttemptAt: now });
        return;
    }

    loginAttempts.set(email, { count: entry.count + 1, firstAttemptAt: entry.firstAttemptAt });
}

function clearFailedAttempts(email: string) {
    loginAttempts.delete(email);
}

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        Credentials({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                const email = credentials.email as string;

                try {
                    if (isRateLimited(email)) {
                        logger.warn("Login rate limited", { email });
                        return null;
                    }

                    const user = await prisma.user.findUnique({
                        where: { email },
                    });

                    if (!user) {
                        recordFailedAttempt(email);
                        logger.warn("Login failed: user not found", { email });
                        return null;
                    }

                    const isValid = compareSync(
                        credentials.password as string,
                        user.password
                    );

                    if (!isValid) {
                        recordFailedAttempt(email);
                        logger.warn("Login failed: invalid password", { email });
                        return null;
                    }

                    clearFailedAttempts(email);
                    logger.info("Login successful", { email, role: user.role });

                    return {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                    };
                } catch (error) {
                    recordFailedAttempt(email);
                    logger.error("Login error", { email, error: String(error) });
                    return null;
                }
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role;
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.role = token.role as string;
                session.user.id = token.id as string;
            }
            return session;
        },
    },
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
    },
    trustHost: true,
});
