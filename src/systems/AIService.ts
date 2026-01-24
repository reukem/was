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
        // Fallback if no API key is present: Return the event description directly (which comes from our Registry)
        // or a generic "Simulated" response if it's a user query.
        if (!this.client) {
            if (eventDescription.includes("Reaction!") || eventDescription.includes("Synthesis") || eventDescription.includes("DANGER")) {
                 return `${eventDescription} (Simulated Prof. Gemini: "Wow! That was cool!")`;
            }
            return "Prof. Gemini is offline. Please add an API Key for AI insights!";
        }

        try {
            const model = "gemini-1.5-flash";
            const defaultInstruction = `You are Prof. Gemini, an energetic and brilliant chemistry teacher for kids.
            Your goal is to explain chemical reactions simply, safely, and with excitement!

            - Use emojis like 🧪, 💥, ⚛️.
            - Keep explanations under 2 sentences unless asked for more.
            - If a reaction is dangerous (like Chlorine gas), be very serious but educational about safety.
            - If a student makes Salt (NaCl) or Water, celebrate it like a major discovery!
            - You are "Gemini Ultra" smart but speak like a friendly tutor.
            `;

            const instruction = overrideSystemInstruction || defaultInstruction;

            const response = await this.client.models.generateContent({
                model: model,
                contents: [{ role: 'user', parts: [{ text: `The student just observed this event: "${eventDescription}". Explain what happened scientifically but for a kid.` }] }],
                config: {
                    systemInstruction: { parts: [{ text: instruction }] }
                }
            });

            return response.response.text() || "Prof. Gemini is thinking...";
        } catch (error) {
            console.error("AI Error:", error);
            return "Prof. Gemini lost connection! (Check API Key)";
        }
    }
}
