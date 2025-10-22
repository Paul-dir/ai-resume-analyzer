// Resume.tsx
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { usePuterStore } from "~/lib/puter";
import Summary from "~/components/Summary";
import Details from "~/components/Details";
import ATS from "~/components/ATS";

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

export const meta = () => ([
    { title: "Resumin | Review" },
    { name: "description", content: "Detailed overview of your resume" },
]);

const Resume = () => {
    const { auth, isLoading, fs, kv } = usePuterStore();
    const [imageUrl, setImageUrl] = useState('');
    const [resumeUrl, setResumeUrl] = useState('');
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    const [isClient, setIsClient] = useState(false);

    const { id } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (!isLoading && !auth.isAuthenticated && id) {
            navigate(`/auth?next=/resume/${id}`);
        }
    }, [isLoading, auth.isAuthenticated, id, navigate]);

    useEffect(() => {
        const normalizeTips = (arr: string[] = [], type: "good" | "improve" = "improve") =>
            arr.map((tip) => ({ type, tip, explanation: tip }));

        const loadResume = async () => {
            if (!kv || !fs || !id) return;

            try {
                const resumeData = await kv.get(`resume:${id}`);
                if (!resumeData) return;

                const data = JSON.parse(resumeData);

                // --- Load Resume PDF ---
                const resumeBlob = await fs.read(data.resumePath);
                if (!resumeBlob) return;
                const pdfUrl = URL.createObjectURL(new Blob([resumeBlob], { type: "application/pdf" }));
                setResumeUrl(pdfUrl);

                // --- Load Image ---
                const imageBlob = await fs.read(data.imagePath);
                if (!imageBlob) return;
                const imgUrl = URL.createObjectURL(imageBlob);
                setImageUrl(imgUrl);

                // --- Map Feedback ---
                const raw = data.feedback;

                const mappedFeedback: Feedback = {
                    overallScore: (raw.overall_rating ?? 0) * 10,
                    ATS: {
                        score: (raw.ats_compatibility ?? 0) * 10,
                        tips: normalizeTips(raw.recommendations ?? [], "improve"),
                    },
                    toneAndStyle: {
                        score: (raw.content_quality_rating ?? 0) * 10,
                        tips: normalizeTips(raw.strengths ?? [], "good"),
                    },
                    content: {
                        score: (raw.experience_rating ?? 0) * 10,
                        tips: normalizeTips(raw.weaknesses?.length ? raw.weaknesses : raw.suggestions, "improve"),
                    },
                    structure: {
                        score: (raw.formatting_rating ?? 0) * 10,
                        tips: [],
                    },
                    skills: {
                        score: (raw.technical_skills_rating ?? 0) * 10,
                        tips: [],
                    },
                };


                setFeedback(mappedFeedback);

            } catch (err) {
                console.error("Error loading resume:", err);
            }
        };

        loadResume();

        return () => {
            if (resumeUrl) URL.revokeObjectURL(resumeUrl);
            if (imageUrl) URL.revokeObjectURL(imageUrl);
        };
    }, [id, kv, fs]);

    if (isLoading || !isClient) {
        return (
            <main className="!pt-0">
                <nav className="resume-nav">
                    <Link to="/" className="back-button">
                        <img src="/icons/back.svg" alt="logo" className="w-2.5 h-2.5" />
                        <span className="text-gray-800 text-sm font-semibold">Back to homepage</span>
                    </Link>
                </nav>
                <div className="flex items-center justify-center min-h-screen">
                    <p>Loading resume data...</p>
                </div>
            </main>
        );
    }

    return (
        <main className="!pt-0">
            <nav className="resume-nav">
                <Link to="/" className="back-button">
                    <img src="/icons/back.svg" alt="logo" className="w-2.5 h-2.5" />
                    <span className="text-gray-800 text-sm font-semibold">Back to homepage</span>
                </Link>
            </nav>

            <div className="flex flex-row w-full max-lg:flex-col-reverse">
                <section className="feedback-section bg-[url('/images/bg-small.svg')] bg-cover h-[100vh] sticky top-0 items-center justify-center">
                    {imageUrl && resumeUrl && (
                        <div className="animate-in fade-in duration-1000 gradient-border max-sm:m-0 h-[90%] w-fit">
                            <a href={resumeUrl} target="_blank" rel="noopener noreferrer">
                                <img
                                    src={imageUrl}
                                    className="w-full h-full object-contain rounded-2xl"
                                    title="resume"
                                />
                            </a>
                        </div>
                    )}
                </section>

                <section className="feedback-section">
                    <h2 className="text-4xl text-black font-bold">Resume Review</h2>
                    <div className="flex flex-col gap-8 animate-in fade-in duration-1000">
                        {feedback ? (
                            <div>
                                <Summary feedback={feedback} />
                                {feedback.ATS && <ATS score={feedback.ATS.score} suggestions={feedback.ATS.tips} />}
                                <Details feedback={feedback} />
                            </div>
                        ) : (
                            <img src="/images/resume-scan-2.gif" className="w-full" />
                        )}
                    </div>
                </section>
            </div>
        </main>
    );
};

export default Resume;
