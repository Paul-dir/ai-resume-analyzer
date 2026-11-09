import type { Route } from "./+types/home";
import Navbar from "~/components/Navbar";
import { resumes as sampleResumes } from "~/constants";
import ResumeCard from "~/components/ResumeCard";
import { usePuterStore } from "~/lib/puter";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

export function meta({}: Route.MetaArgs) {
    return [
        { title: "Resumind | AI Resume Analyzer" },
        { name: "description", content: "Smart AI-powered feedback for your dream job!" },
    ];
}

export default function Home() {
    const { isLoading, auth, kv } = usePuterStore();
    const [userResumes, setUserResumes] = useState<Resume[]>([]);
    const [loadingUserResumes, setLoadingUserResumes] = useState(false);

    // Load resumes stored in Puter KV
    const loadUserResumes = async () => {
        if (!kv || !auth.isAuthenticated) {
            setUserResumes([]);
            return;
        }

        try {
            setLoadingUserResumes(true);
            const items = await kv.list("resume:*", true);
            if (!items) {
                setUserResumes([]);
                return;
            }

            const parsedResumes: Resume[] = [];

            // Puter kv.list can return either an array of KVItem objects or string keys
            for (const item of items as any[]) {
                try {
                    let resumeData: any = null;
                    if (typeof item === "string") {
                        const raw = await kv.get(item);
                        if (raw) resumeData = typeof raw === "string" ? JSON.parse(raw) : raw;
                    } else if (item && typeof item === "object") {
                        if (item.value) {
                            resumeData = typeof item.value === "string" ? JSON.parse(item.value) : item.value;
                        } else if (item.key) {
                            const raw = await kv.get(item.key);
                            if (raw) resumeData = typeof raw === "string" ? JSON.parse(raw) : raw;
                        }
                    }

                    if (resumeData && resumeData.id) {
                        parsedResumes.push(resumeData);
                    }
                } catch (parseErr) {
                    console.warn("Failed to parse resume item from KV:", parseErr);
                }
            }

            // Sort newest first
            parsedResumes.sort((a: any, b: any) => {
                const dateA = new Date(a.createdAt || 0).getTime();
                const dateB = new Date(b.createdAt || 0).getTime();
                return dateB - dateA;
            });

            setUserResumes(parsedResumes);
        } catch (err) {
            console.error("Error loading user resumes:", err);
        } finally {
            setLoadingUserResumes(false);
        }
    };

    useEffect(() => {
        if (auth.isAuthenticated) {
            loadUserResumes();
        } else {
            setUserResumes([]);
        }
    }, [auth.isAuthenticated, kv]);

    const handleDeleteResume = async (id: string) => {
        try {
            await kv.delete(`resume:${id}`);
            setUserResumes((prev) => prev.filter((r) => r.id !== id));
        } catch (err) {
            console.error("Failed to delete resume:", err);
            alert("Failed to delete resume. Please try again.");
        }
    };

    return (
        <main className="bg-[url('/images/bg-main.svg')] bg-cover min-h-screen">
            <Navbar />
            <section className="main-section px-4 pb-24">
                <div className="page-heading py-12 max-w-3xl mx-auto text-center">
                    <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight">
                        Track Your Applications & Resumes
                    </h1>
                    <h2 className="text-lg sm:text-xl text-gray-600 mt-4">
                        Review your submissions and get AI-powered feedback with actionable ATS insights.
                    </h2>

                    <div className="mt-8 flex justify-center gap-4">
                        <Link to="/upload" className="primary-button text-base font-semibold px-8 py-3.5 w-auto shadow-md hover:opacity-95">
                            Upload Resume for Analysis
                        </Link>
                    </div>
                </div>

                {/* Authenticated User Resumes Section */}
                {auth.isAuthenticated && (
                    <div className="w-full max-w-7xl mx-auto mt-6">
                        <div className="flex items-center justify-between mb-6 px-2">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900">Your Resumes</h3>
                                <p className="text-sm text-gray-500">
                                    Resumes uploaded and analyzed under your account
                                </p>
                            </div>
                            <span className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-medium">
                                {userResumes.length} saved
                            </span>
                        </div>

                        {loadingUserResumes ? (
                            <div className="flex justify-center items-center py-12">
                                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : userResumes.length > 0 ? (
                            <div className="resumes-section">
                                {userResumes.map((resume) => (
                                    <ResumeCard
                                        key={resume.id}
                                        resume={resume}
                                        className="w-full sm:w-[350px] lg:w-[380px]"
                                        onDelete={handleDeleteResume}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 border-2 border-dashed border-gray-200 rounded-2xl bg-white/60 text-center max-w-xl mx-auto">
                                <p className="text-gray-600 font-medium">You haven't analyzed any resumes yet.</p>
                                <p className="text-gray-400 text-sm mt-1">Upload your first resume to see ATS score and feedback here.</p>
                                <Link to="/upload" className="inline-block mt-4 text-sm font-semibold text-blue-600 hover:underline">
                                    + Upload your first resume
                                </Link>
                            </div>
                        )}
                    </div>
                )}

                {/* Sample Resumes Section */}
                <div className="w-full max-w-7xl mx-auto mt-14">
                    <div className="mb-6 px-2 text-left">
                        <h3 className="text-2xl font-bold text-gray-900">
                            {auth.isAuthenticated && userResumes.length > 0 ? "Sample Benchmark Resumes" : "Explore Sample Analyses"}
                        </h3>
                        <p className="text-sm text-gray-500">
                            Click any sample below to preview what an AI review looks like.
                        </p>
                    </div>

                    <div className="resumes-section">
                        {sampleResumes.map((resume) => (
                            <ResumeCard
                                key={resume.id}
                                resume={resume}
                                className="w-full sm:w-[350px] lg:w-[380px]"
                            />
                        ))}
                    </div>
                </div>
            </section>
        </main>
    );
}
