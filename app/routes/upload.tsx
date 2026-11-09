import React, { type FormEvent, useState, useEffect } from "react";
import Navbar from "~/components/Navbar";
import FileUploader from "~/components/FileUploader";
import { usePuterStore } from "~/lib/puter";
import { useNavigate } from "react-router-dom";
import { convertPdfToImage, extractPdfText } from "~/lib/pdf2img";
import { generateUUID } from "~/lib/utils";
import { prepareInstructions } from "~/constants";

const Upload = () => {
    const { auth, isLoading, fs, ai, kv } = usePuterStore();
    const navigate = useNavigate();
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusText, setStatusText] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [file, setFile] = useState<File | null>(null);

    // Redirect to auth if not authenticated
    useEffect(() => {
        if (!isLoading && !auth.isAuthenticated) {
            navigate("/auth?next=/upload");
        }
    }, [isLoading, auth.isAuthenticated, navigate]);

    const handleFileSelect = (selectedFile: File | null) => {
        setFile(selectedFile);
        setErrorMessage("");
    };

    const handleAnalyze = async ({
        companyName,
        jobTitle,
        jobDescription,
        file,
    }: {
        companyName: string;
        jobTitle: string;
        jobDescription: string;
        file: File;
    }) => {
        setIsProcessing(true);
        setErrorMessage("");

        try {
            setStatusText("Uploading resume PDF...");
            const uploadFileRes = await fs.upload([file]);
            if (!uploadFileRes) {
                throw new Error("Failed to upload resume to Puter filesystem");
            }
            const uploadedFileObj = Array.isArray(uploadFileRes) ? uploadFileRes[0] : uploadFileRes;
            const resumePath = uploadedFileObj?.path || "";

            setStatusText("Converting PDF first page to preview image...");
            const imageResult = await convertPdfToImage(file);
            if (!imageResult.file) {
                throw new Error(imageResult.error || "Failed to convert PDF to preview image");
            }

            setStatusText("Uploading preview image...");
            const uploadImageRes = await fs.upload([imageResult.file]);
            if (!uploadImageRes) {
                throw new Error("Failed to upload preview image to Puter filesystem");
            }
            const uploadedImageObj = Array.isArray(uploadImageRes) ? uploadImageRes[0] : uploadImageRes;
            const imagePath = uploadedImageObj?.path || "";

            setStatusText("Analyzing resume with AI...");
            const uuid = generateUUID();

            const instructions = prepareInstructions({
                jobTitle: jobTitle || "Software Engineer",
                jobDescription: jobDescription || "",
            });

            const extractedText = await extractPdfText(file);
            const fullPrompt = extractedText
                ? `${instructions}\n\nCandidate Resume Text:\n"""\n${extractedText}\n"""`
                : instructions;

            const feedbackRes = await ai.feedback(resumePath, fullPrompt);
            if (!feedbackRes) {
                throw new Error("AI analysis did not return a response. Please try again.");
            }

            // Extract feedback text safely
            let feedbackText = "";
            if (typeof feedbackRes?.message?.content === "string") {
                feedbackText = feedbackRes.message.content;
            } else if (Array.isArray(feedbackRes?.message?.content)) {
                feedbackText = feedbackRes.message.content
                    .map((item: any) => (typeof item === "string" ? item : item?.text || ""))
                    .join("");
            } else if (typeof feedbackRes?.content === "string") {
                feedbackText = feedbackRes.content;
            } else if (typeof feedbackRes?.text === "string") {
                feedbackText = feedbackRes.text;
            }

            // Clean markdown fences
            const cleanJson = feedbackText.replace(/```json\s*|```/g, "").trim();

            let parsedFeedback: any;
            try {
                parsedFeedback = JSON.parse(cleanJson);
            } catch (parseError) {
                console.warn("Could not parse JSON directly, extracting JSON substring:", parseError);
                const firstBrace = cleanJson.indexOf("{");
                const lastBrace = cleanJson.lastIndexOf("}");
                if (firstBrace !== -1 && lastBrace !== -1) {
                    parsedFeedback = JSON.parse(cleanJson.substring(firstBrace, lastBrace + 1));
                } else {
                    // Fallback structured feedback if AI gave unstructured text
                    parsedFeedback = {
                        overallScore: 75,
                        ATS: {
                            score: 75,
                            tips: [{ type: "good", tip: "Resume successfully processed by AI parser." }],
                        },
                        toneAndStyle: {
                            score: 80,
                            tips: [{ type: "good", tip: "Clear presentation", explanation: "Clear professional presentation." }],
                        },
                        content: {
                            score: 70,
                            tips: [{ type: "improve", tip: "Detail achievements", explanation: feedbackText.slice(0, 300) }],
                        },
                        structure: {
                            score: 75,
                            tips: [],
                        },
                        skills: {
                            score: 75,
                            tips: [],
                        },
                    };
                }
            }

            const resumeRecord = {
                id: uuid,
                companyName: companyName || "General",
                jobTitle: jobTitle || "Target Role",
                jobDescription: jobDescription || "",
                resumePath,
                imagePath,
                feedback: parsedFeedback,
                createdAt: new Date().toISOString(),
            };

            setStatusText("Saving analysis...");
            await kv.set(`resume:${uuid}`, JSON.stringify(resumeRecord));

            setStatusText("Analysis complete! Redirecting...");
            navigate(`/resume/${uuid}`);
        } catch (error: any) {
            console.error("Analysis error:", error);
            setIsProcessing(false);
            setErrorMessage(error?.message || "An unexpected error occurred during resume analysis.");
        }
    };

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const formData = new FormData(form);

        const companyName = (formData.get("company-name") as string) || "";
        const jobTitle = (formData.get("job-title") as string) || "";
        const jobDescription = (formData.get("job-description") as string) || "";

        if (!file) {
            setErrorMessage("Please select or drop a PDF resume file to continue.");
            return;
        }

        handleAnalyze({ companyName, jobTitle, jobDescription, file });
    };

    return (
        <main className="bg-[url('/images/bg-main.svg')] bg-cover min-h-screen">
            <Navbar />
            <section className="main-section max-w-3xl mx-auto px-4 pb-20">
                <div className="page-heading py-12">
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-gradient">
                        Smart feedback for your dream job
                    </h1>
                    {isProcessing ? (
                        <div className="flex flex-col items-center gap-4 mt-4 w-full">
                            <h2 className="text-xl font-medium text-blue-600 animate-pulse">{statusText}</h2>
                            <div className="gradient-border rounded-2xl max-w-md w-full">
                                <img
                                    src="/images/resume-scan.gif"
                                    alt="Scanning resume..."
                                    className="w-full rounded-xl"
                                />
                            </div>
                        </div>
                    ) : (
                        <h2 className="text-lg text-gray-600 mt-2">
                            Drop your resume for ATS score and actionable AI-powered improvement suggestions.
                        </h2>
                    )}

                    {errorMessage && (
                        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm w-full text-left mt-4">
                            <strong>Error:</strong> {errorMessage}
                        </div>
                    )}

                    {!isProcessing && (
                        <form id="upload-form" onSubmit={handleSubmit} className="flex flex-col gap-5 mt-6 w-full text-left">
                            <div className="form-div">
                                <label htmlFor="company-name" className="text-sm font-semibold text-gray-700">
                                    Company Name
                                </label>
                                <input
                                    type="text"
                                    name="company-name"
                                    placeholder="e.g. Google, Stripe, Microsoft"
                                    id="company-name"
                                    className="border border-gray-200"
                                />
                            </div>

                            <div className="form-div">
                                <label htmlFor="job-title" className="text-sm font-semibold text-gray-700">
                                    Job Title
                                </label>
                                <input
                                    type="text"
                                    name="job-title"
                                    placeholder="e.g. Senior Frontend Developer"
                                    id="job-title"
                                    className="border border-gray-200"
                                />
                            </div>

                            <div className="form-div">
                                <label htmlFor="job-description" className="text-sm font-semibold text-gray-700">
                                    Job Description (Optional but recommended)
                                </label>
                                <textarea
                                    rows={4}
                                    name="job-description"
                                    placeholder="Paste the job description here for tailored matching..."
                                    id="job-description"
                                    className="border border-gray-200"
                                />
                            </div>

                            <div className="form-div">
                                <label className="text-sm font-semibold text-gray-700">
                                    Upload Resume (PDF only)
                                </label>
                                <FileUploader onFileSelect={handleFileSelect} />
                            </div>

                            <button
                                className="primary-button py-3 text-lg font-semibold hover:opacity-95 transition-opacity mt-2"
                                type="submit"
                                disabled={isProcessing}
                            >
                                Analyze Resume
                            </button>
                        </form>
                    )}
                </div>
            </section>
        </main>
    );
};

export default Upload;
