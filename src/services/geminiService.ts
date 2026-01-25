import { GoogleGenAI } from "@google/genai";

export class GeminiService {
    private ai: GoogleGenAI | null = null;

    constructor() {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (apiKey) {
            this.ai = new GoogleGenAI({ apiKey });
        } else {
            console.warn("VITE_GEMINI_API_KEY not found in environment variables.");
        }
    }

    async getProfessorFeedback(eventDescription: string): Promise<string> {
        if (!this.ai) {
             return "I can't access my lab notes right now (API Key missing), but that looked fascinating!";
        }

        try {
            const response = await this.ai.models.generateContent({
                model: 'gemini-1.5-flash',
                contents: [
                    {
                        role: 'user',
                        parts: [
                            {
                                text: `A student just performed a chemical interaction in our virtual lab.
                                Action: ${eventDescription}.

                                Respond as Professor Alchemist, a brilliant, eccentric, and witty chemistry professor.
                                Briefly explain the science (1-2 sentences max). Use emojis. Be encouraging but emphasize safety!`
                            }
                        ]
                    }
                ],
                config: {
                    systemInstruction: {
                        parts: [
                            { text: "You are Professor Alchemist. You are energetic, slightly mad-scientist but very knowledgeable. You treat the lab like your greatest masterpiece." }
                        ]
                    },
                    temperature: 0.9,
                }
            });

            return response.response.text() || "Splendid progress, apprentice! Let us continue the experiment.";
        } catch (error) {
            console.error("Gemini AI error:", error);
            return "My molecular sensors are slightly jittery today, but that was a fascinating result!";
        }
    }
}
