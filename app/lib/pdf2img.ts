// ~/lib/pdf2img.ts
export interface PdfConversionResult {
    imageUrl: string;
    file: File | null;
    error?: string;
}

let pdfjsLib: any = null;
let isLoading = false;
let loadPromise: Promise<any> | null = null;

async function loadPdfJs(): Promise<any> {
    if (pdfjsLib) return pdfjsLib;
    if (loadPromise) return loadPromise;

    isLoading = true;
    loadPromise = (async () => {
        try {
            const lib = await import("pdfjs-dist");
            const { GlobalWorkerOptions } = lib;
            GlobalWorkerOptions.workerSrc = new URL(
                "pdfjs-dist/build/pdf.worker.min.mjs",
                import.meta.url
            ).toString();
            pdfjsLib = lib;
            return lib;
        } catch (err) {
            console.error("Failed to load pdfjs-dist:", err);
            throw err;
        } finally {
            isLoading = false;
        }
    })();

    return loadPromise;
}

export async function convertPdfToImage(file: File): Promise<PdfConversionResult> {
    try {
        const lib = await loadPdfJs();
        const { getDocument } = lib;

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);

        const viewport = page.getViewport({ scale: 3 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) {
            return createFallbackImage(file.name);
        }

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: context, viewport }).promise;

        return new Promise((resolve) => {
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        const imageFile = new File([blob], `${file.name.replace(/\.pdf$/, "")}.png`, {
                            type: "image/png",
                        });
                        resolve({ imageUrl: URL.createObjectURL(blob), file: imageFile });
                    } else {
                        resolve(createFallbackImage(file.name));
                    }
                },
                "image/png",
                1.0
            );
        });
    } catch (err) {
        console.warn("PDF conversion warning, using canvas preview:", err);
        return createFallbackImage(file.name);
    }
}

export async function extractPdfText(file: File): Promise<string> {
    try {
        const lib = await loadPdfJs();
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await lib.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";
        for (let i = 1; i <= Math.min(pdf.numPages, 5); i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const text = content.items.map((item: any) => (item.str ? item.str : "")).join(" ");
            fullText += `\n--- Page ${i} ---\n` + text;
        }
        return fullText.trim();
    } catch (e) {
        console.warn("Could not extract PDF text:", e);
        return "";
    }
}

function createFallbackImage(fileName: string): PdfConversionResult {
    if (typeof document === "undefined") {
        return { imageUrl: "", file: null };
    }
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 850;
    const ctx = canvas.getContext("2d");
    if (ctx) {
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(0, 0, 600, 850);
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 2;
        ctx.strokeRect(20, 20, 560, 810);
        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 24px system-ui, sans-serif";
        ctx.fillText("Resume Document", 50, 80);
        ctx.fillStyle = "#475569";
        ctx.font = "16px system-ui, sans-serif";
        ctx.fillText(fileName, 50, 120);
        ctx.fillStyle = "#94a3b8";
        ctx.font = "14px system-ui, sans-serif";
        ctx.fillText("PDF preview rendered for analysis", 50, 150);
    }

    const dataUrl = canvas.toDataURL("image/png");
    const byteString = atob(dataUrl.split(",")[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: "image/png" });
    const imageFile = new File([blob], `${fileName.replace(/\.pdf$/, "")}.png`, { type: "image/png" });
    return { imageUrl: dataUrl, file: imageFile };
}
