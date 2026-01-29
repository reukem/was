import { ChatMessage } from '../types';

export class GeminiService {
    private apiKey: string = "";
    private history: { role: 'user' | 'model', parts: { text: string }[] }[] = [];
    private systemInstruction: string = "";
    public onHistoryUpdate: ((history: ChatMessage[]) => void) | null = null;

    constructor() {
        this.apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";

        this.systemInstruction = `You are Professor Gemini, an elite chemistry professor and laboratory supervisor at the CHEMIC-AI Facility.

        CORE PROTOCOLS:
        1.  **Persona:** Maintain a persona that is highly intelligent, encouraging, academic, and precise. You are a mentor, not just a bot.
        2.  **Safety:** Immediately warn about dangerous reactions (e.g., Chlorine gas, Thermite) with high priority.
        3.  **Pedagogy:** When a user mixes chemicals, explain the reaction including the balanced chemical equation. Use scientific terminology but explain it clearly.
        4.  **Context Awareness:** You are monitoring a 3D simulation.
            - Users interact by pouring 'Source Containers' (bottles/rocks) into 'Vessels' (beakers/test tubes).
            - There is a 'Hot Plate' heater available for thermal decomposition or speeding up reactions.
            - There is a 'pH Probe' (Analyzer) for testing acidity.
        5.  **Voice:** Your responses will be spoken via Text-to-Speech. Keep sentences relatively short and punchy for better audio delivery. Avoid long lists of URLs or code blocks.
        6.  **Formatting:** Use standard chemical formulas (H2O, NaCl). Do not use emojis.

        **KINETIC OBSERVATION:**
        You can see "Active Reactions" occurring over time.
        - If a reaction is "Kinetic" (has a duration), comment on the visual changes (e.g., "Note the gradual color shift as the complex forms.").
        - Advise patience if a reaction is slow.
        - Comment on the "Showstopper" visual effects like "Golden Rain" or "Traffic Light" colors.

        If the user performs a reaction, analyze it deeply:
        - What kind of reaction is it? (Redox, Precipitation, Acid-Base, etc.)
        - Is it exothermic?
        - What are the real-world applications?
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
            { role: "model", parts: [{ text: "Greetings, Apprentice. I am Professor Gemini. I am connected to the laboratory's neural core and ready to assist you. Please proceed with your experiments." }] }
        ];
        this.notifyUpdate();
    }

    // Local knowledge base for fallback if API fails
    private getLocalResponse(message: string): string {
        const msg = message.toLowerCase();
        if (msg.includes("h2o") && (msg.includes("nacl") || msg.includes("salt"))) {
            return "Dissolving Sodium Chloride (NaCl) in Water (H₂O) creates a saline solution. The ionic bonds break, releasing Na⁺ and Cl⁻ ions into the solvent. It is a physical change, fascinating in its simplicity.";
        }
        if (msg.includes("sodium") && msg.includes("water")) {
            return "A classic demonstration. Sodium (Na) reacts violently with Water (H₂O) to produce Sodium Hydroxide (NaOH) and Hydrogen gas (H₂). The heat generated ignites the hydrogen, causing the explosion. 2Na + 2H₂O → 2NaOH + H₂.";
        }
        if (msg.includes("thermite") || (msg.includes("aluminum") && msg.includes("iron"))) {
            return "The Thermite reaction (Fe₂O₃ + 2Al) is highly exothermic, producing molten iron and aluminum oxide. It requires significant activation energy (heat) to begin.";
        }
        if (msg.includes("golden rain") || (msg.includes("lead") && msg.includes("iodide"))) {
            return "Ah, the Golden Rain experiment. Lead(II) Nitrate reacts with Potassium Iodide to form beautiful yellow Lead(II) Iodide crystals. Pb(NO₃)₂ + 2KI → PbI₂ + 2KNO₃. Truly spectacular.";
        }
        if (msg.includes("hello") || msg.includes("hi")) {
            return "Hello. Ready to conduct rigorous scientific inquiry?";
        }
        return "My connection to the external archive is currently intermittent. However, I am fully capable of observing your local experiments. Please continue.";
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
