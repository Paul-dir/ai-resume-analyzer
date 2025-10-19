// import React from "react"; // not needed in modern React setups
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { usePuterStore } from "~/lib/puter";

export const meta = () => ([
    { title: "Resumin | Auth" },
    { name: "description", content: "Log into your account" },
]);

const Auth = () => {
    const { isLoading, auth } = usePuterStore();
    const location = useLocation();
    const navigate = useNavigate();

    // Extract ?next=somepath
    const next = new URLSearchParams(location.search).get("next") || "/";

    // Redirect if already logged in
    useEffect(() => {
        if (auth?.isAuthenticated) {
            navigate(next);
        }
    }, [auth?.isAuthenticated, next, navigate]);

    return (
        <main className="bg-[url('/images/bg-auth.svg')] bg-cover min-h-screen flex items-center justify-center">
            <div className="gradient-border shadow-lg rounded-2xl">
                <section className="flex flex-col items-center gap-8 bg-white rounded-2xl p-10 w-[350px] sm:w-[400px]">

                    {/* Header */}
                    <div className="flex flex-col items-center gap-2 text-center">
                        <h1 className="text-2xl font-bold text-gray-900">Welcome</h1>
                        <p className="text-gray-600 text-sm">
                            Log in to continue your job journey
                        </p>
                    </div>

                    {/* Auth Button */}
                    {isLoading ? (
                        <button
                            className="auth-button bg-gray-300 text-gray-700 px-8 py-3 rounded-full animate-pulse cursor-not-allowed w-full max-w-[220px]"
                            disabled
                        >
                            Signing you in...
                        </button>
                    ) : (
                        <>
                            {auth?.isAuthenticated ? (
                                <button
                                    className="auth-button bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-full transition-all w-full max-w-[220px]"
                                    onClick={auth.signOut}
                                >
                                    Log Out
                                </button>
                            ) : (
                                <button
                                    className="auth-button bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full transition-all w-full max-w-[220px]"
                                    onClick={auth.signIn}
                                >
                                    Log In
                                </button>
                            )}
                        </>
                    )}

                </section>
            </div>
        </main>
    );
};

export default Auth;
