// index.d.ts

interface Job {
    title: string;
    description: string;
    location: string;
    requiredSkills: string[];
}

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
    overallScore: number;
    ATS: {
        score: number;
        tips: {
            type: "good" | "improve";
            tip: string;
        }[];
    };
    toneAndStyle: SectionFeedback;
    content: SectionFeedback;
    structure: SectionFeedback;
    skills: SectionFeedback;
}

interface Resume {
    id: string;
    companyName?: string;
    jobTitle?: string;
    imagePath: string;
    resumePath: string;
    feedback: Feedback;
}
