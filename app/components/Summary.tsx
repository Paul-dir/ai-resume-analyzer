// Summary.tsx
import ScoreGauge from "./ScoreGauge";

interface Feedback {
    ATS?: { score: number; tips: { type: "good" | "improve"; tip: string }[] };
    toneAndStyle?: { score: number };
    content?: { score: number };
    structure?: { score: number };
    skills?: { score: number };
    overallScore?: number;
}

// Small colored badge depending on score strength
const ScoreBadge = ({ score }: { score: number }) => {
    const badgeColor =
        score > 69 ? "bg-badge-green"
            : score > 49 ? "bg-badge-yellow"
                : "bg-badge-red";

    const textColor =
        score > 69 ? "text-green-600"
            : score > 49 ? "text-yellow-600"
                : "text-red-600";

    const badgeText =
        score > 69 ? "Strong"
            : score > 49 ? "Good Start"
                : "Needs Work";

    return (
        <div className={`score-badge ${badgeColor}`}>
            <p className={`text-xs ${textColor} font-semibold`}>{badgeText}</p>
        </div>
    );
};

// Each scoring category (Tone, Content, etc.)
const Category = ({ title, score }: { title: string; score: number }) => {
    const textColor =
        score > 69 ? "text-green-600"
            : score > 49 ? "text-yellow-600"
                : "text-red-600";

    return (
        <div className="resume-summary">
            <div className="category">
                <div className="flex flex-row gap-2 items-center justify-center">
                    <p className="text-2xl">{title}</p>
                    <ScoreBadge score={score} />
                </div>
                <p className="text-2xl">
                    <span className={textColor}>{score}</span>/100
                </p>
            </div>
        </div>
    );
};

// Main summary component
const Summary = ({ feedback }: { feedback: Feedback }) => {
    // safely extract each score (fallback 0 if undefined)
    const overall = feedback.overallScore ?? 0;
    const tone = feedback.toneAndStyle?.score ?? 0;
    const content = feedback.content?.score ?? 0;
    const structure = feedback.structure?.score ?? 0;
    const skills = feedback.skills?.score ?? 0;

    return (
        <div className="bg-white rounded-2xl shadow-md w-full">
            <div className="flex flex-row max-sm:flex-col items-center p-4 gap-8">
                <ScoreGauge score={overall} />
                <div className="flex flex-col gap-2">
                    <h2 className="text-2xl font-bold">Your Resume Score</h2>
                    <p className="text-sm text-gray-500">
                        This score is calculated based on the variables listed below.
                    </p>
                </div>
            </div>

            <Category title="Tone & Style" score={tone} />
            <Category title="Content" score={content} />
            <Category title="Structure" score={structure} />
            <Category title="Skills" score={skills} />
        </div>
    );
};

export default Summary;
