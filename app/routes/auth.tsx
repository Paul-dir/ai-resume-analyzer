import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { usePuterStore } from "~/lib/puter";

export const meta = () => ([
    { title: "Resumind | Auth" },
    { name: "description", content: "Log into your account" },
]);

const Auth: React.FC = () => {
    const { isLoading, auth, setAuth } = usePuterStore();
    const location = useLocation();
    const navigate = useNavigate();
    const [loginConfirmed, setLoginConfirmed] = useState(false);
    const [initialized, setInitialized] = useState(false);

    // Extract ?next=somepath, default to '/upload'
    const next = new URLSearchParams(location.search).get("next") || "/upload";

    // Check auth status on mount
    useEffect(() => {
        auth.checkAuthStatus().then((isSignedIn: boolean) => {
            console.log('Initial auth check:', { isSignedIn, isAuthenticated: auth.isAuthenticated });
            if (isSignedIn) {
                setLoginConfirmed(true);
            }
            setInitialized(true);
        });
    }, [auth.checkAuthStatus, auth.isAuthenticated]);

    // Debug auth state
    useEffect(() => {
        console.log('Auth state:', { isAuthenticated: auth.isAuthenticated, isLoading, loginConfirmed, next });
    }, [auth.isAuthenticated, isLoading, loginConfirmed, next]);

    // Redirect only after confirmed login
    useEffect(() => {
        if (auth.isAuthenticated && !isLoading && loginConfirmed && initialized) {
            console.log('Redirecting to:', next);
            navigate(next, { replace: true });
        }
    }, [auth.isAuthenticated, isLoading, loginConfirmed, initialized, next, navigate]);

    // Handle login
    const handleSignIn = async () => {
        if (!auth.signIn) {
            console.error('auth.signIn is undefined');
            return;
        }
        try {
            console.log('Attempting login');
            await auth.signIn();
            console.log('Login successful');
            setLoginConfirmed(true);
        } catch (err) {
            console.error('Login error:', err);
            setLoginConfirmed(false);
        }
    };

    // Handle logout
    const handleSignOut = async () => {
        if (!auth.signOut) {
            console.error('auth.signOut is undefined');
            return;
        }
        try {
            console.log('Attempting logout');
            await auth.signOut();
            console.log('Logout successful');
            setLoginConfirmed(false);
            navigate("/auth");
        } catch (err) {
            console.error('Logout error:', err);
        }
    };

    // Show loading state until initialized
    if (!initialized) {
        return (
            <main className="flex items-center justify-center min-h-screen bg-gray-100">
                <p>Loading authentication state...</p>
            </main>
        );
    }

    return (
        <main className="bg-[url('/images/bg-auth.svg')] bg-cover min-h-screen flex items-center justify-center">
            <div className="gradient-border shadow-lg rounded-2xl">
                <section className="flex flex-col gap-8 bg-white rounded-2xl p-10 w-[350px] sm:w-[400px]">
                    {/* Header */}
                    <div className="flex flex-col gap-2 items-center text-center">
                        <h1 className="text-2xl font-bold text-gray-900">Welcome</h1>
                        <h2 className="text-gray-600 text-sm">
                            Log in to continue your journey
                        </h2>
                    </div>

                    {/* Auth Buttons */}
                    {isLoading ? (
                        <button
                            className="auth-button bg-gray-300 text-gray-700 px-8 py-3 rounded-full animate-pulse cursor-not-allowed"
                            disabled
                        >
                            Signing you in...
                        </button>
                    ) : auth.isAuthenticated && loginConfirmed ? (
                        <button
                            className="auth-button bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-full transition-all"
                            onClick={handleSignOut}
                            disabled={!auth.signOut}
                        >
                            Log Out
                        </button>
                    ) : (
                        <button
                            className="auth-button bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full transition-all"
                            onClick={handleSignIn}
                            disabled={!auth.signIn}
                        >
                            Log In
                        </button>
                    )}
                </section>
            </div>
        </main>
    );
};

export default Auth;