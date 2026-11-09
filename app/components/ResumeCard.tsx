import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ScoreCircle from "~/components/ScoreCircle";
import { cn } from "~/lib/utils";
import { usePuterStore } from "~/lib/puter";

interface ResumeCardProps {
    resume: Resume;
    className?: string;
    onDelete?: (id: string) => void;
}

const ResumeCard: React.FC<ResumeCardProps> = ({
    resume: { id, companyName, jobTitle, feedback, imagePath },
    className,
    onDelete,
}) => {
    const { fs } = usePuterStore();
    const [imgSrc, setImgSrc] = useState<string>(imagePath || "/images/resume-1.png");

    useEffect(() => {
        if (!imagePath) return;

        if (imagePath.startsWith("/") || imagePath.startsWith("http") || imagePath.startsWith("data:")) {
            setImgSrc(imagePath);
            return;
        }

        let objectUrl = "";
        let isMounted = true;

        fs.read(imagePath)
            .then((blob) => {
                if (blob && isMounted) {
                    objectUrl = URL.createObjectURL(blob);
                    setImgSrc(objectUrl);
                }
            })
            .catch((err) => {
                console.error("Failed to load resume thumbnail:", err);
            });

        return () => {
            isMounted = false;
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [imagePath, fs]);

    const handleDelete = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm(`Are you sure you want to delete the resume analysis for ${companyName || "this job"}?`)) {
            onDelete?.(id);
        }
    };

    return (
        <div className={cn("resume-card relative group animate-in fade-in duration-500 shadow-sm hover:shadow-md transition-shadow", className)}>
            <Link to={`/resume/${id}`} className="flex flex-col h-full gap-4">
                <div className="resume-card-header">
                    <div className="flex flex-col gap-1 pr-2 overflow-hidden">
                        <h2 className="text-black font-bold break-words text-xl truncate">
                            {companyName || "Untitled Company"}
                        </h2>
                        <h3 className="text-base break-words text-gray-500 truncate">
                            {jobTitle || "Resume Analysis"}
                        </h3>
                    </div>
                    <div className="flex-shrink-0">
                        <ScoreCircle score={feedback?.overallScore ?? 75} />
                    </div>
                </div>

                <div className="gradient-border flex-1 overflow-hidden rounded-2xl flex items-center justify-center bg-gray-50">
                    <img
                        src={imgSrc}
                        alt={`${companyName || "Resume"} preview`}
                        className="w-full h-[320px] max-sm:h-[200px] object-cover object-top rounded-lg"
                        onError={() => setImgSrc("/images/resume-1.png")}
                    />
                </div>
            </Link>

            {onDelete && (
                <button
                    onClick={handleDelete}
                    title="Delete resume"
                    className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-full shadow-sm border border-gray-100 transition-all opacity-0 group-hover:opacity-100"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            )}
        </div>
    );
};

export default ResumeCard;
