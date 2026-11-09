import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { usePuterStore } from "~/lib/puter";

export const meta = () => [
    { title: "Resumind | Auth" },
    { name: "description", content: "Log into your Resumind account" },
];

const Auth: React.FC = () => {
    const { isLoading, auth, puterReady } = usePuterStore();
    const location = useLocation();
    const navigate = useNavigate();
    const [authError, setAuthError] = useState("");
    const [isAuthenticating, setIsAuthenticating] = useState(false);

    // Extract ?next=somepath, default to '/'
    const next = new URLSearchParams(location.search).get("next") || "/";

    useEffect(() => {
        // If already logged in and not explicitly staying on auth, redirect to destination
        if (auth.isAuthenticated && !isLoading && !isAuthenticating) {
            navigate(next, { replace: true });
        }
    }, [auth.isAuthenticated, isLoading, next, navigate, isAuthenticating]);

    const handleSignIn = async () => {
        setAuthError("");
        setIsAuthenticating(true);
        try {
            await auth.signIn();
            const isSignedIn = await auth.checkAuthStatus();
            if (isSignedIn) {
                navigate(next, { replace: true });
            }
        } catch (err: any) {
            console.error("Login error:", err);
            setAuthError(err?.message || "Failed to sign in with Puter. Please try again.");
        } finally {
            setIsAuthenticating(false);
        }
    };

    const handleSignOut = async () => {
        setAuthError("");
        try {
            await auth.signOut();
        } catch (err: any) {
            console.error("Logout error:", err);
            setAuthError(err?.message || "Failed to log out.");
        }
    };

    return (
        <main className="bg-[url('/images/bg-auth.svg')] bg-cover min-h-screen flex items-center justify-center p-4">
            <div className="gradient-border shadow-xl rounded-3xl w-full max-w-md">
                <section className="flex flex-col gap-6 bg-white rounded-2xl p-8 sm:p-10 text-center">
                    {/* Header */}
                    <div className="flex flex-col gap-1 items-center">
                        <Link to="/" className="text-2xl font-black text-gradient tracking-tight mb-2">
                            RESUMIND
                        </Link>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {auth.isAuthenticated ? "Welcome Back!" : "Account Login"}
                        </h1>
                        <h2 className="text-gray-500 text-sm">
                            {auth.isAuthenticated
                                ? `You are signed in as ${auth.user?.username || "Puter User"}`
                                : "Sign in to save and analyze your resumes with AI"}
                        </h2>
                    </div>

                    {authError && (
                        <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs text-left">
                            {authError}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-3 mt-2">
                        {auth.isAuthenticated ? (
                            <>
                                <button
                                    onClick={() => navigate(next, { replace: true })}
                                    className="primary-button py-3 text-base font-semibold"
                                >
                                    Continue to App
                                </button>
                                <button
                                    onClick={handleSignOut}
                                    className="border border-red-200 text-red-600 hover:bg-red-50 py-2.5 rounded-full text-sm font-medium transition-colors cursor-pointer"
                                >
                                    Sign Out
                                </button>
                            </>
                        ) : (
                            <button
                                className="primary-button py-3.5 text-base font-semibold hover:opacity-95 transition-all flex items-center justify-center gap-2"
                                onClick={handleSignIn}
                                disabled={isAuthenticating || isLoading}
                            >
                                {isAuthenticating ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        <span>Connecting to Puter...</span>
                                    </>
                                ) : (
                                    <span>Sign in with Puter</span>
                                )}
                            </button>
                        )}

                        <Link
                            to="/"
                            className="text-xs text-gray-500 hover:text-gray-800 transition-colors mt-2"
                        >
                            ← Back to homepage
                        </Link>
                    </div>
                </section>
            </div>
        </main>
    );
};

export default Auth;
