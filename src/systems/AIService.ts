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

    async getFeedback(eventDescription: string): Promise<string> {
        if (!this.client) {
            return "AI Teacher is offline (No API Key provided).";
        }

        try {
            const model = "gemini-1.5-flash"; // Or gemini-2.0-flash if available
            const systemInstruction = "You are Professor Alchemist, a wise, safe, and slightly eccentric chemistry teacher. A student is performing experiments in a virtual lab. React to their actions. If they do something dangerous (like mixing acid and base without care), warn them. If they succeed, congratulate them. If the result is boring, give a fun fact about the chemicals involved. Keep your response short (max 2 sentences).";

            const response = await this.client.models.generateContent({
                model: model,
                contents: [{ role: 'user', parts: [{ text: `Student Action: ${eventDescription}` }] }],
                config: {
                    systemInstruction: { parts: [{ text: systemInstruction }] }
                }
            });

            return response.response.text() || "The Professor is thinking...";
        } catch (error) {
            console.error("AI Error:", error);
            return "The Professor is distracted (API Error).";
        }
    }
}
