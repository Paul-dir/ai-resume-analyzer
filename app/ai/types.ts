export type AiProvider = "anthropic" | "ollama" | "gemini" | "mock";

export interface AIResponse {
  text: string;
  content?: string;
  message?: {
    role?: string;
    content: string | any[];
  };
  raw?: any;
}
