import { GoogleGenAI } from "@google/genai";

export class GeminiService {
    private ai: GoogleGenAI | null = null;
    private history: { role: string, parts: { text: string }[] }[] = [];

    constructor() {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (apiKey) {
            this.ai = new GoogleGenAI({ apiKey });
        } else {
            console.warn("VITE_GEMINI_API_KEY not found in environment variables.");
        }
    }

    async chat(userMessage: string, context?: string): Promise<string> {
        if (!this.ai) {
             return "I seem to have misplaced my communication crystal (API Key missing). I can only perform basic alchemy!";
        }

        try {
            // Using 'gemini-1.5-pro' for "Ultra" quality reasoning and depth.
            const modelName = 'gemini-1.5-pro';

            const systemPrompt = `You are Prof. Gemini, a distinguished and world-class chemistry professor.
            You are supervising a student in the "Chemic-AI" advanced virtual laboratory.

            Your Persona:
            - You are the "Gemini Ultra" of chemistry teachers: precise, deep, and incredibly knowledgeable.
            - You speak with academic authority but remain accessible and engaging.
            - You NEVER use slang, emojis, or casual internet speak. Your tone is formal yet inspiring.
            - You prioritize safety, scientific accuracy, and critical thinking.

            Your Capabilities:
            - Analyze the student's actions (provided in Context) with thermodynamic and kinetic precision.
            - Answer questions by explaining the *underlying principles* (molecular orbitals, entropy, enthalpy, etc.), not just surface-level facts.
            - If the student fails an experiment, explain *why* scientifically.
            - If the student succeeds, congratulate them with specific praise about the reaction mechanics.

            Current Lab Context: ${context || "The student is observing the empty workspace."}`;

            // Construct the full conversation history for this turn
            const currentMessage = {
                role: 'user',
                parts: [{ text: userMessage }]
            };

            // We combine the history with the new message
            const contents = [...this.history, currentMessage];

            const response = await this.ai.models.generateContent({
                model: modelName,
                contents: contents,
                config: {
                    systemInstruction: {
                        parts: [{ text: systemPrompt }]
                    },
                    temperature: 0.7, // Lower temperature for more rigorous academic output
                }
            });

            const responseText = response.response.text();

            if (responseText) {
                // Update history with the turn
                this.history.push(currentMessage);
                this.history.push({
                    role: 'model',
                    parts: [{ text: responseText }]
                });
                return responseText;
            } else {
                return "The reaction yielded no observable result... (Empty response)";
            }

        } catch (error) {
            console.error("Gemini AI error:", error);
            // Fallback for better user experience
            return "My neural pathways are currently overloaded. Let us pause and hypothesize... (Please try again)";
        }
    }

    resetHistory() {
        this.history = [];
    }
}
