import React from "react";
import { Link } from "react-router-dom";
import { usePuterStore } from "~/lib/puter";

const Navbar: React.FC = () => {
    const { auth, isLoading } = usePuterStore();

    const handleSignOut = async () => {
        try {
            await auth.signOut();
        } catch (err) {
            console.error("Sign out failed:", err);
        }
    };

    return (
        <nav className="navbar shadow-sm">
            <Link to="/" className="flex items-center gap-2">
                <span className="text-2xl font-black text-gradient tracking-tight">RESUMIND</span>
            </Link>

            <div className="flex items-center gap-4">
                {!isLoading && (
                    <>
                        {auth.isAuthenticated && auth.user ? (
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-gray-700 hidden sm:inline-block">
                                    {auth.user.username || "Account"}
                                </span>
                                <button
                                    onClick={handleSignOut}
                                    className="text-xs text-gray-500 hover:text-red-600 transition-colors px-2 py-1 border border-gray-200 rounded-lg"
                                >
                                    Sign Out
                                </button>
                            </div>
                        ) : (
                            <Link
                                to="/auth"
                                className="text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors px-3 py-1.5"
                            >
                                Sign In
                            </Link>
                        )}
                    </>
                )}

                <Link to="/upload" className="primary-button w-fit text-sm font-medium">
                    Upload Resume
                </Link>
            </div>
        </nav>
    );
};

export default Navbar;
