import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { usePuterStore } from "~/lib/puter";
import Summary from "~/components/Summary";
import Details from "~/components/Details";
import ATS from "~/components/ATS";
import { resumes as sampleResumes } from "~/constants";

interface Tip {
    type: "good" | "improve";
    tip: string;
    explanation: string;
}

interface SectionFeedback {
    score: number;
    tips: Tip[];
}

interface Feedback {
    overallScore?: number;
    ATS?: {
        score: number;
        tips: Tip[];
    };
    toneAndStyle?: SectionFeedback;
    content?: SectionFeedback;
    structure?: SectionFeedback;
    skills?: SectionFeedback;
}

export const meta = () => [
    { title: "Resumind | Review" },
    { name: "description", content: "Detailed overview of your resume analysis" },
];

const Resume = () => {
    const { auth, isLoading, fs, kv } = usePuterStore();
    const [imageUrl, setImageUrl] = useState("");
    const [resumeUrl, setResumeUrl] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [jobTitle, setJobTitle] = useState("");
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    const [isClient, setIsClient] = useState(false);
    const [loadError, setLoadError] = useState("");

    const { id } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (!isLoading && !auth.isAuthenticated && id && !sampleResumes.some((s) => s.id === id)) {
            navigate(`/auth?next=/resume/${id}`);
        }
    }, [isLoading, auth.isAuthenticated, id, navigate]);

    useEffect(() => {
        if (!id) return;

        let activeResumeUrl = "";
        let activeImageUrl = "";
        let isMounted = true;

        const normalizeTips = (arr: any[] = [], defaultType: "good" | "improve" = "improve"): Tip[] => {
            if (!Array.isArray(arr)) return [];
            return arr.map((item) => {
                if (typeof item === "string") {
                    return { type: defaultType, tip: item, explanation: item };
                }
                return {
                    type: item.type === "good" ? "good" : "improve",
                    tip: item.tip || item.title || "Observation",
                    explanation: item.explanation || item.tip || "",
                };
            });
        };

        const mapFeedbackData = (raw: any): Feedback => {
            if (!raw) return { overallScore: 70 };

            // Check if already in the target Feedback format
            if (raw.overallScore !== undefined || raw.toneAndStyle !== undefined) {
                return {
                    overallScore: Number(raw.overallScore ?? 70),
                    ATS: {
                        score: Number(raw.ATS?.score ?? raw.overallScore ?? 70),
                        tips: normalizeTips(raw.ATS?.tips ?? []),
                    },
                    toneAndStyle: {
                        score: Number(raw.toneAndStyle?.score ?? 70),
                        tips: normalizeTips(raw.toneAndStyle?.tips ?? [], "good"),
                    },
                    content: {
                        score: Number(raw.content?.score ?? 70),
                        tips: normalizeTips(raw.content?.tips ?? []),
                    },
                    structure: {
                        score: Number(raw.structure?.score ?? 70),
                        tips: normalizeTips(raw.structure?.tips ?? []),
                    },
                    skills: {
                        score: Number(raw.skills?.score ?? 70),
                        tips: normalizeTips(raw.skills?.tips ?? []),
                    },
                };
            }

            // Legacy / alternate rating keys
            return {
                overallScore: Math.round((raw.overall_rating ?? 7) * 10),
                ATS: {
                    score: Math.round((raw.ats_compatibility ?? 7) * 10),
                    tips: normalizeTips(raw.recommendations ?? [], "improve"),
                },
                toneAndStyle: {
                    score: Math.round((raw.content_quality_rating ?? 7) * 10),
                    tips: normalizeTips(raw.strengths ?? [], "good"),
                },
                content: {
                    score: Math.round((raw.experience_rating ?? 7) * 10),
                    tips: normalizeTips(raw.weaknesses?.length ? raw.weaknesses : raw.suggestions ?? [], "improve"),
                },
                structure: {
                    score: Math.round((raw.formatting_rating ?? 7) * 10),
                    tips: normalizeTips(raw.formatting_tips ?? [], "improve"),
                },
                skills: {
                    score: Math.round((raw.technical_skills_rating ?? 7) * 10),
                    tips: normalizeTips(raw.skill_gaps ?? [], "improve"),
                },
            };
        };

        const loadResume = async () => {
            try {
                // 1. Check if it's one of the sample demo resumes
                const sample = sampleResumes.find((item) => item.id === id);
                if (sample) {
                    if (isMounted) {
                        setResumeUrl(sample.resumePath);
                        setImageUrl(sample.imagePath);
                        setCompanyName(sample.companyName || "Sample Company");
                        setJobTitle(sample.jobTitle || "Sample Role");
                        setFeedback(mapFeedbackData(sample.feedback));
                    }
                    return;
                }

                // 2. Fetch from Puter KV
                if (!kv || !fs) return;
                const resumeData = await kv.get(`resume:${id}`);
                if (!resumeData) {
                    if (isMounted) setLoadError("Resume analysis not found or has been deleted.");
                    return;
                }

                const data = typeof resumeData === "string" ? JSON.parse(resumeData) : resumeData;
                if (!isMounted) return;

                setCompanyName(data.companyName || "");
                setJobTitle(data.jobTitle || "");
                setFeedback(mapFeedbackData(data.feedback));

                // Load resume PDF
                const resumePathStr = typeof data.resumePath === "string" ? data.resumePath : data.resumePath?.path;
                if (resumePathStr) {
                    if (resumePathStr.startsWith("/") || resumePathStr.startsWith("http")) {
                        activeResumeUrl = resumePathStr;
                        setResumeUrl(resumePathStr);
                    } else {
                        const resumeBlob = await fs.read(resumePathStr);
                        if (resumeBlob && isMounted) {
                            activeResumeUrl = URL.createObjectURL(new Blob([resumeBlob], { type: "application/pdf" }));
                            setResumeUrl(activeResumeUrl);
                        }
                    }
                }

                // Load resume preview image
                const imagePathStr = typeof data.imagePath === "string" ? data.imagePath : data.imagePath?.path;
                if (imagePathStr) {
                    if (imagePathStr.startsWith("/") || imagePathStr.startsWith("http")) {
                        activeImageUrl = imagePathStr;
                        setImageUrl(imagePathStr);
                    } else {
                        const imageBlob = await fs.read(imagePathStr);
                        if (imageBlob && isMounted) {
                            activeImageUrl = URL.createObjectURL(imageBlob);
                            setImageUrl(activeImageUrl);
                        }
                    }
                }
            } catch (err: any) {
                console.error("Error loading resume:", err);
                if (isMounted) setLoadError(err?.message || "Failed to load resume details.");
            }
        };

        loadResume();

        return () => {
            isMounted = false;
            if (activeResumeUrl && activeResumeUrl.startsWith("blob:")) {
                URL.revokeObjectURL(activeResumeUrl);
            }
            if (activeImageUrl && activeImageUrl.startsWith("blob:")) {
                URL.revokeObjectURL(activeImageUrl);
            }
        };
    }, [id, kv, fs]);

    if (isLoading || !isClient) {
        return (
            <main className="!pt-0">
                <nav className="resume-nav bg-white">
                    <Link to="/" className="back-button">
                        <img src="/icons/back.svg" alt="back" className="w-3 h-3" />
                        <span className="text-gray-800 text-sm font-semibold">Back to homepage</span>
                    </Link>
                </nav>
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-600 text-sm">Loading resume data...</p>
                </div>
            </main>
        );
    }

    if (loadError) {
        return (
            <main className="!pt-0">
                <nav className="resume-nav bg-white">
                    <Link to="/" className="back-button">
                        <img src="/icons/back.svg" alt="back" className="w-3 h-3" />
                        <span className="text-gray-800 text-sm font-semibold">Back to homepage</span>
                    </Link>
                </nav>
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 max-w-md mx-auto text-center px-4">
                    <h2 className="text-2xl font-bold text-gray-800">Resume Not Found</h2>
                    <p className="text-gray-600">{loadError}</p>
                    <Link to="/upload" className="primary-button w-auto px-6 py-2.5">
                        Upload a Resume
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main className="!pt-0 min-h-screen bg-gray-50/50">
            <nav className="resume-nav bg-white shadow-sm">
                <Link to="/" className="back-button hover:bg-gray-50 transition-colors">
                    <img src="/icons/back.svg" alt="back" className="w-3 h-3" />
                    <span className="text-gray-800 text-sm font-semibold">Back to homepage</span>
                </Link>

                <div className="flex items-center gap-3">
                    <Link to="/upload" className="primary-button text-xs py-1.5 px-4">
                        + New Analysis
                    </Link>
                </div>
            </nav>

            <div className="flex flex-row w-full max-lg:flex-col-reverse max-w-7xl mx-auto py-6 px-4 gap-6">
                {/* Left section: Document Preview */}
                <section className="w-1/2 max-lg:w-full lg:sticky lg:top-6 self-start flex flex-col items-center">
                    {imageUrl ? (
                        <div className="gradient-border rounded-2xl w-full max-w-md p-3 shadow-md bg-white">
                            <div className="flex justify-between items-center pb-2 px-1 text-xs text-gray-500 font-medium">
                                <span>Preview</span>
                                {resumeUrl && (
                                    <a
                                        href={resumeUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline flex items-center gap-1"
                                    >
                                        Open full PDF
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                    </a>
                                )}
                            </div>
                            <div className="overflow-hidden rounded-xl bg-gray-100 flex items-center justify-center max-h-[80vh]">
                                <a href={resumeUrl || imageUrl} target="_blank" rel="noopener noreferrer" className="cursor-zoom-in">
                                    <img
                                        src={imageUrl}
                                        alt="Resume document preview"
                                        className="w-full h-auto object-contain rounded-xl max-h-[75vh]"
                                    />
                                </a>
                            </div>
                        </div>
                    ) : (
                        <div className="gradient-border rounded-2xl w-full max-w-md p-8 text-center text-gray-500">
                            <p>Preview not available for this document.</p>
                        </div>
                    )}
                </section>

                {/* Right section: Feedback & Analysis */}
                <section className="w-1/2 max-lg:w-full flex flex-col gap-6">
                    <div>
                        <span className="text-xs font-semibold tracking-wider uppercase text-blue-600">
                            {companyName ? `${companyName} • ${jobTitle || "Role"}` : "AI Resume Analysis"}
                        </span>
                        <h1 className="text-3xl font-extrabold text-gray-900 mt-1">Detailed Resume Review</h1>
                    </div>

                    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
                        {feedback ? (
                            <>
                                <Summary feedback={feedback} />
                                {feedback.ATS && (
                                    <ATS score={feedback.ATS.score} suggestions={feedback.ATS.tips} />
                                )}
                                <Details feedback={feedback} />
                            </>
                        ) : (
                            <div className="p-8 text-center">
                                <img src="/images/resume-scan-2.gif" alt="Analyzing" className="w-full max-w-xs mx-auto" />
                                <p className="text-gray-500 text-sm mt-3">Evaluating scoring metrics...</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </main>
    );
};

export default Resume;
