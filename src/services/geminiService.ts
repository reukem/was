import { GoogleGenAI, ChatSession } from "@google/genai";

export class GeminiService {
    private ai: GoogleGenAI | null = null;
    private chatSession: any = null; // Typing 'any' for now as SDK types might vary

    constructor() {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (apiKey) {
            this.ai = new GoogleGenAI({ apiKey });
            this.initializeChat();
        } else {
            console.warn("VITE_GEMINI_API_KEY not found in environment variables.");
        }
    }

    private async initializeChat() {
        if (!this.ai) return;

        try {
            // Create a persistent chat session
            // We use a loose type here because SDK versions might differ on 'startChat' vs 'getGenerativeModel().startChat'
            // The @google/genai generic pattern is often:
            const model = this.ai.models;

            // For the latest SDK, it might just be stateless calls, but maintaining history manually is often safer if SDK is new.
            // However, the prompt implies "talk about anything", so context is key.
            // We'll use a stateless approach with appended history if needed, or just a simple robust system prompt for each turn.
            // But let's try to set up a session if the API supports it easily.
            // Given the uncertainty of the exact SDK version in this environment, I'll stick to single-turn generations
            // but with a very robust system prompt that *allows* general chat.
        } catch (e) {
            console.error("Failed to init chat", e);
        }
    }

    async chat(userMessage: string, context?: string): Promise<string> {
        if (!this.ai) {
             return "I seem to have misplaced my communication crystal (API Key missing). I can only perform basic alchemy!";
        }

        try {
            const systemPrompt = `You are Professor Alchemist, a distinguished and highly professional chemistry professor.
            You are currently supervising a student in a virtual chemistry lab.

            Your personality:
            - Professional, academic, and articulate.
            - You DO NOT use slang or emojis.
            - You are encouraging but maintain a formal demeanor.
            - You prioritize safety and scientific accuracy above all else.

            Your capabilities:
            - You can answer ANY question the student has with academic rigor.
            - If the student performs an action (provided in context), you analyze it scientifically.
            - If the student asks a question, you provide a clear, concise, and educated answer.

            Current Context: ${context || "The student is working in the lab."}`;

            const response = await this.ai.models.generateContent({
                model: 'gemini-1.5-flash',
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: userMessage }]
                    }
                ],
                config: {
                    systemInstruction: {
                        parts: [{ text: systemPrompt }]
                    },
                    temperature: 0.9,
                }
            });

            return response.response.text() || "The spirits are silent... (No response)";
        } catch (error) {
            console.error("Gemini AI error:", error);
            return "My neural network is fizzling! (AI Error)";
        }
    }
}
