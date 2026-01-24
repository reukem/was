import { GoogleGenAI } from "@google/genai";

export class AIService {
    private client: GoogleGenAI | null = null;
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
        if (apiKey) {
            this.client = new GoogleGenAI({ apiKey });
        }
    }

    async getFeedback(eventDescription: string, overrideSystemInstruction?: string): Promise<string> {
        if (!this.client) {
            return "Prof. Gemini is offline (No API Key provided).";
        }

        try {
            const model = "gemini-1.5-flash";
            const defaultInstruction = "You are Prof. Gemini, a friendly and encouraging chemistry teacher for kids. Explain the reaction simply and safely. Keep it short.";

            const instruction = overrideSystemInstruction || defaultInstruction;

            const response = await this.client.models.generateContent({
                model: model,
                contents: [{ role: 'user', parts: [{ text: `Student Action: ${eventDescription}` }] }],
                config: {
                    systemInstruction: { parts: [{ text: instruction }] }
                }
            });

            return response.response.text() || "Prof. Gemini is thinking...";
        } catch (error) {
            console.error("AI Error:", error);
            return "Prof. Gemini is distracted (API Error).";
        }
    }
}
