"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

import Image from "next/image";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const result = await signIn("credentials", {
            email,
            password,
            redirect: false,
        });

        if (result?.error) {
            setError("Invalid email or password");
            setLoading(false);
        } else {
            router.push("/dashboard");
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div style={{ position: "relative", width: "120px", height: "120px", margin: "0 auto 1.5rem" }}>
                    <Image
                        src="/logo.png"
                        alt="Tirth Cons logo"
                        fill
                        style={{ objectFit: "contain" }}
                        unoptimized
                        priority
                    />
                </div>
                <h2>Welcome to Tirth Construction</h2>
                <p className="subtitle">Construction Operations Ledger System</p>

                {error && <div className="error-msg">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group" style={{ textAlign: "left" }}>
                        <label>Email Address</label>
                        <input
                            type="email"
                            className="form-input"
                            placeholder="admin@cols.local"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group" style={{ textAlign: "left" }}>
                        <label>Password</label>
                        <input
                            type="password"
                            className="form-input"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: "100%", justifyContent: "center", marginTop: "0.5rem" }}
                        disabled={loading}
                    >
                        {loading ? "Signing in..." : "Sign In"}
                    </button>
                </form>

                <p style={{ marginTop: "1.5rem", fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                    Default: admin@cols.local / admin123
                </p>
            </div>
        </div>
    );
}
