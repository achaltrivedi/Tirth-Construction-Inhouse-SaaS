import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import { compareSync } from "bcryptjs";
import { logger } from "@/lib/logger";

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
                    const user = await prisma.user.findUnique({
                        where: { email },
                    });

                    if (!user) {
                        logger.warn("Login failed: user not found", { email });
                        return null;
                    }

                    const isValid = compareSync(
                        credentials.password as string,
                        user.password
                    );

                    if (!isValid) {
                        logger.warn("Login failed: invalid password", { email });
                        return null;
                    }

                    logger.info("Login successful", { email, role: user.role });

                    return {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                    };
                } catch (error) {
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
});
