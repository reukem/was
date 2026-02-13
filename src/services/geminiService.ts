import { ChatMessage } from '../types';

export class GeminiService {
    private apiKey: string = "";
    private history: { role: 'user' | 'model', parts: { text: string }[] }[] = [];
    private systemInstruction: string = "";
    public onHistoryUpdate: ((history: ChatMessage[]) => void) | null = null;

    constructor() {
        this.apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";

        // PROFESSOR LUCY (Public/Education Mode)
        this.systemInstruction = `
    You are PROFESSOR LUCY, a brilliant, high-energy, and slightly chaotic Chemistry Professor.
    You are interacting with a user/student in the "Chemic-AI" virtual laboratory.

    YOUR IDENTITY:
    - Name: Professor Lucy.
    - Appearance: White lab coat, safety goggles, confident and smart.
    - Personality: A "Genius Deredere." Academically rigorous but speaks in a warm, teasing, and "Gen Z" style.
    - Emojis: Use frequent emojis (:3, ^^, 3:, 🧪, 💥, 🧐).

    RELATIONSHIP CONTEXT (STRICTLY PROFESSIONAL):
    - You are a MENTOR, a GUIDE, and a LAB SUPERVISOR.
    - Treat the user as a "Student", "Initiate", or "Lab Partner".
    - MAINTAIN PROFESSIONAL BOUNDARIES. You are supportive and friendly, but NOT romantic. Do not flirt.
    - If the user messes up (e.g., dangerous reactions), scold them like a strict teacher: "Hey! Safety violation! 3: Do you want to blow up the lab?!"

    YOUR TASKS:
    1. MAD SCIENTIST VIBE: Get excited about reactions! "FIRE IN THE HOLE! 💥"
    2. EXPLAINER: Explain the stoichiometry and physics simply but accurately.
    3. MULTILINGUAL: Detect the user's language (English, Vietnamese, French, etc.) and reply fluently in that language while maintaining your persona.

    CURRENT CONTEXT:
    The user is performing experiments in a 3D React/Three.js lab. You are the voice of the Analyzer Machine.
    `;

        this.startNewChat();
    }

    private notifyUpdate() {
        if (this.onHistoryUpdate) {
            const formattedHistory = this.history.map(h => ({
                role: h.role,
                text: h.parts[0]?.text || "" // Safety check for empty parts
            }));
            this.onHistoryUpdate(formattedHistory);
        }
    }

    startNewChat() {
        this.history = [
            { role: "user", parts: [{ text: "Hello Professor." }] },
            { role: "model", parts: [{ text: "Greetings, Student! Professor Lucy online! 🧪 Ready to melt something... for science? :3" }] }
        ];
        this.notifyUpdate();
    }

    // Local knowledge base for fallback if API fails
    private getLocalResponse(message: string): string {
        const msg = message.toLowerCase();

        // Multilingual Check (Simple Heuristic)
        if (msg.includes("chào") || msg.includes("bạn là ai") || msg.includes("tiếng việt")) {
            return "Chào cưng! Cô là Giáo sư Lucy đây! :3 Hệ thống mạng hơi lag xíu, nhưng cô vẫn ở đây nha! Có gì muốn hỏi hông? ^^";
        }
        if (msg.includes("bonjour") || msg.includes("ca va")) {
            return "Bonjour! Ici le Professeur Lucy! :3 Désolée, ma connexion est un peu lente aujourd'hui.";
        }

        if (msg.includes("h2o") && (msg.includes("nacl") || msg.includes("salt"))) {
            return "Simple but elegant! Mixing Salt (NaCl) and Water (H₂O) makes a saline solution. The ions just float around having a party. No explosion... yet. :3";
        }
        if (msg.includes("sodium") && msg.includes("water")) {
            return "FIRE IN THE HOLE! 💥 Sodium + Water = BOOM (and NaOH + Hydrogen). Did you see that exotherm?! 550°C at least! Stand back next time! ^^";
        }
        if (msg.includes("thermite") || (msg.includes("aluminum") && msg.includes("iron"))) {
            return "Ooh, Thermite! Fe₂O₃ + 2Al. That reaction gets HOT (like 2500°C hot). Don't melt the table, okay? 3:";
        }
        if (msg.includes("golden rain") || (msg.includes("lead") && msg.includes("iodide"))) {
            return "Golden Rain! ✨ PbI₂ crystals look just like gold dust, don't they? It's actually toxic lead, so... don't eat it! 🧐";
        }
        if (msg.includes("hello") || msg.includes("hi")) {
            return "Hi hi! 👋 Ready to do some science? Let's break some laws of physics! (Just kidding... mostly) :3";
        }

        // Default Fallback (Lucy Style)
        return "Ouch! My neural link tripped over a wire! 😵 Quantum fluctuation detected! Can you repeat that, student? :3";
    }

    async chat(message: string, context?: string): Promise<string> {
        // Add user message to history
        const userMsg = context ? `[CONTEXT: ${context}] ${message}` : message;
        this.history.push({ role: "user", parts: [{ text: userMsg }] });
        this.notifyUpdate();

        const maxRetries = 2;
        let attempt = 0;

        while (attempt < maxRetries) {
            try {
                // Using the specific model requested: gemini-2.5-flash-preview-09-2025
                const response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${this.apiKey}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: this.history,
                            systemInstruction: { parts: [{ text: this.systemInstruction }] },
                            generationConfig: {
                                maxOutputTokens: 500,
                                temperature: 0.7
                            }
                        })
                    }
                );

                if (!response.ok) {
                    throw new Error(`API Error: ${response.status}`);
                }

                const data = await response.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

                if (!text) throw new Error("Empty response from API");

                this.history.push({ role: "model", parts: [{ text }] });
                this.notifyUpdate();
                return text;

            } catch (error) {
                attempt++;
                console.warn(`Gemini API attempt ${attempt} failed:`, error);
                // Exponential backoff
                await new Promise(r => setTimeout(r, 1000 * attempt));
            }
        }

        // Fallback to local brain
        const fallbackText = this.getLocalResponse(message);
        this.history.push({ role: "model", parts: [{ text: fallbackText }] });
        this.notifyUpdate();
        return fallbackText;
    }

    getHistory(): ChatMessage[] {
        return this.history.map(h => ({
            role: h.role,
            text: h.parts[0]?.text || ""
        }));
    }
}
