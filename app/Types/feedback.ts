// types.ts
export interface Tip {
    type: "good" | "improve";
    tip: string;
    explanation?: string;
}

export interface SectionFeedback {
    score: number;
    tips: Tip[];
}

export interface ATSFeedback {
    score: number;
    tips: Tip[];
}

export interface Feedback {
    overallScore: number;
    ATS: ATSFeedback;
    toneAndStyle: SectionFeedback;
    content: SectionFeedback;
    structure: SectionFeedback;
    skills: SectionFeedback;
}
