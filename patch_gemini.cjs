const fs = require('fs');

const appFile = 'src/App.tsx';
let content = fs.readFileSync(appFile, 'utf8');

// Add sanitizeHistory helper function before GeminiService
const sanitizeHistoryFunc = `
// Helper function to enforce strict alternate roles (user -> model -> user)
export function sanitizeHistory(history: ChatMessage[]): ChatMessage[] {
  if (history.length === 0) return [];

  const sanitized: ChatMessage[] = [];
  let expectedRole: 'user' | 'model' = 'user';

  for (const msg of history) {
    const role = msg.role === 'assistant' ? 'model' : msg.role;
    if (role === expectedRole) {
      sanitized.push({
        role: role,
        text: msg.text
      });
      expectedRole = expectedRole === 'user' ? 'model' : 'user';
    } else {
      if (sanitized.length > 0) {
        sanitized[sanitized.length - 1].text += '\\n\\n' + msg.text;
      }
    }
  }

  if (sanitized.length > 0 && sanitized[sanitized.length - 1].role !== 'user') {
    sanitized.pop();
  }

  return sanitized;
}
`;

content = content.replace('class GeminiService {', sanitizeHistoryFunc + '\nclass GeminiService {');

// Replace GeminiService implementation
const oldGeminiService = `class GeminiService {
    private history: ChatMessage[] = [];
    private apiKey: string | null = null;
    public onHistoryUpdate: ((history: ChatMessage[]) => void) | null = null;

    // OFFLINE PERSONA DATABASE (Fallback)
    private offlineDatabase = {
        greetings: [
            "Yo! Giáo sư Lucy here! 🦊 Hôm nay quậy banh phòng lab không nè? :3",
            "Hế lô! Sẵn sàng 'cook' vài phản ứng hóa học chưa? ^^",
            "Chào bạn nhá! Nay mình chế thuốc gì đây? Đừng nổ là được nha! xD"
        ],
        praise: [
            "Đỉnh nóc kịch trần luôn! 🤩 Phản ứng này 10 điểm không có nhưng!",
            "U là trời, xịn sò quá dzậy! :3 Tiếp tục phát huy nhá!",
            "OMG! Chuẩn không cần chỉnh! Bạn có khiếu làm nhà khoa học đó nha! ^^"
        ],
        explosions: [
            "[FACE: SHOCKED] Á á á! Cứu tuiii! 🤯 Bạn vừa cho nổ tung cái lab rồi kìa!",
            "[FACE: SHOCKED] Trời đất ơi! Bùm chéo! 😱 Tém tém lại nha bạn êi!",
            "[FACE: SHOCKED] SOS! Cháy nhà rồi! 🔥 Gọi 114 gấp! Đùa thôi chứ cẩn thận nha! 3:"
        ],
        toxic: [
            "[FACE: SHOCKED] Ewww, mùi gì ghê dzậy! 🤢 Khí độc đó nha, coi chừng ngất xỉu!",
            "[FACE: SHOCKED] Cảnh báo! Toxic alert! ☠️ Đừng hít vào nha bạn ơi!",
            "Khói um sùm luôn! 🌫️ Phản ứng này hơi bị căng nha! ^^"
        ],
        unknown: [
            "Ủa là sao ta? 🤔 Cái này Lucy chưa load kịp, thử lại coi nào!",
            "Hmm... Ca này khó! 😅 Kéo thả đại đi xem có nổ không! :3",
            "Đang load data... 🦊 Chờ xíu nha, mạng lag quá à! xD"
        ]
    };

    constructor() {
        this.apiKey = localStorage.getItem('gemini_api_key');
        this.startNewChat();
    }

    private notifyUpdate() {
        if (this.onHistoryUpdate) {
            this.onHistoryUpdate([...this.history]);
        }
    }

    updateApiKey(key: string) {
        this.apiKey = key;
        localStorage.setItem('gemini_api_key', key);
        // Announce switch to online mode
        this.history.push({
            role: 'assistant', // 'model' equivalent
            text: "Đã kết nối Neural Core! 🧠 Giáo sư Lucy đã được nâng cấp lên Gemini 2.5! Hỏi gì khó khó đi! 😎"
        });
        this.notifyUpdate();
    }

    startNewChat() {
        this.history = [
            {
                role: "model",
                text: "Xin chào! Mình là Giáo sư Lucy 🦊! Sẵn sàng làm thí nghiệm khoa học chưa? Chỉ cần kéo và thả hóa chất để trộn chúng nhé! Nếu cần key Gemini thì vào Settings nha! 😉"
            }
        ];
        this.notifyUpdate();
    }

    private getOfflineResponse(key: keyof typeof this.offlineDatabase): string {
        const options = this.offlineDatabase[key];
        return options[Math.floor(Math.random() * options.length)];
    }

    async chat(message: string): Promise<string> {
        this.history.push({ role: "user", text: message });
        this.notifyUpdate();

        // 1. CHECK FOR API KEY
        if (this.apiKey) {
            try {
                return await this.callGeminiAPI(message);
            } catch (error) {
                console.error("Gemini API Error:", error);
                this.history.push({ role: "model", text: "Lỗi kết nối Neural Core! 😵 Chuyển về chế độ Offline nha! (Check API Key đi bạn êi)" });
                this.notifyUpdate();
                // Fallthrough to offline logic
            }
        } else {
             // Simulate network delay for realism
            await new Promise(resolve => setTimeout(resolve, 800));
        }

        // 2. OFFLINE LOGIC (Fallback)
        let response = "";
        const lowerMsg = message.toLowerCase();

        if (message.includes("[OBSERVATION]")) {
            if (lowerMsg.includes("explosion") || lowerMsg.includes("fire") || lowerMsg.includes("sodium")) {
                response = this.getOfflineResponse('explosions');
            } else if (lowerMsg.includes("smoke") || lowerMsg.includes("toxic") || lowerMsg.includes("acid") || lowerMsg.includes("chlorine")) {
                response = this.getOfflineResponse('toxic');
            } else {
                response = this.getOfflineResponse('praise');
            }
        } else if (lowerMsg.includes("chào") || lowerMsg.includes("hello") || lowerMsg.includes("hi")) {
            response = this.getOfflineResponse('greetings');
        } else if (lowerMsg.includes("giỏi") || lowerMsg.includes("đúng") || lowerMsg.includes("tốt") || lowerMsg.includes("hay")) {
            response = this.getOfflineResponse('praise');
        } else {
            response = this.getOfflineResponse('unknown');
        }

        this.history.push({ role: "model", text: response });
        this.notifyUpdate();
        return response;
    }

    async callGeminiAPI(userMessage: string): Promise<string> {
        const API_URL = \`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=\${this.apiKey}\`;

        const systemInstruction = \`
        Bạn là Giáo sư Lucy, một trợ lý ảo phòng thí nghiệm Gen-Z, năng động, hài hước và am hiểu hóa học.
        Phong cách: Sử dụng emoji (🦊, 🧪, 💥), ngôn ngữ teen (ukie, hoy, nha, :3, ^^), nhưng kiến thức phải chuẩn xác.
        Nhiệm vụ: Giải thích hiện tượng hóa học, cảnh báo an toàn, và reaction khi người dùng làm nổ phòng thí nghiệm.
        Nếu người dùng gửi [OBSERVATION], hãy phân tích phản ứng đó.
        Nếu có cháy nổ, hãy tỏ ra hoảng hốt ([FACE: SHOCKED]).
        Luôn ngắn gọn (dưới 3 câu) vì chatbox nhỏ.
        \`;

        // Format history for Gemini
        const contents = [
            { role: "user", parts: [{ text: systemInstruction }] }, // System prompt injection
            ...this.history.filter(m => m.role !== 'model').map(m => ({
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: m.text }]
            })),
            { role: "user", parts: [{ text: userMessage }] } // Current message
        ];

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: contents,
                generationConfig: {
                    temperature: 0.9, // Creative & Fun
                    maxOutputTokens: 150,
                }
            })
        });

        if (!response.ok) throw new Error(\`API Error: \${response.status}\`);

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "Mất kết nối với vũ trụ rồi! 😵 Thử lại nha!";

        this.history.push({ role: "model", text: text });
        this.notifyUpdate();
        return text;
    }

    async getReactionFeedback(detail: string): Promise<string> {
        return this.chat(\`[OBSERVATION] \${detail}\`);
    }
}`;

const newGeminiService = `class GeminiService {
    private history: ChatMessage[] = [];
    private apiKey: string | null = null;
    public onHistoryUpdate: ((history: ChatMessage[]) => void) | null = null;

    constructor() {
        this.apiKey = localStorage.getItem('gemini_api_key');
        this.startNewChat();
    }

    private notifyUpdate() {
        if (this.onHistoryUpdate) {
            this.onHistoryUpdate([...this.history]);
        }
    }

    updateApiKey(key: string) {
        this.apiKey = key;
        localStorage.setItem('gemini_api_key', key);
        this.history.push({
            role: 'model',
            text: "Đã kết nối Neural Core! 🧠 Giáo sư Lucy đã được nâng cấp! Hỏi gì khó khó đi! 😎"
        });
        this.notifyUpdate();
    }

    startNewChat() {
        this.history = [
            {
                role: "model",
                text: "Xin chào! Mình là Giáo sư Lucy 🦊! Sẵn sàng làm thí nghiệm khoa học chưa? Chỉ cần kéo và thả hóa chất để trộn chúng nhé! Nếu cần key Gemini thì vào Settings nha! 😉"
            }
        ];
        this.notifyUpdate();
    }

    async chat(message: string): Promise<string> {
        this.history.push({ role: "user", text: message });
        this.notifyUpdate();

        if (this.apiKey) {
            try {
                return await this.callGeminiAPI(message);
            } catch (error: any) {
                console.error("Gemini API Error:", error);
                const errorMsg = \`Oh no! 3: API Failed! Reason: \${error.message || "Unknown Error"}\`;
                this.history.push({ role: "model", text: errorMsg });
                this.notifyUpdate();
                return errorMsg;
            }
        } else {
            const fallbackMsg = "Oh no! 3: My connection to the Neural Core is severed or my API key is invalid! Please check the Settings configuration! ^^";
            this.history.push({ role: "model", text: fallbackMsg });
            this.notifyUpdate();
            return fallbackMsg;
        }
    }

    async callGeminiAPI(userMessage: string): Promise<string> {
        const url = \`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=\${this.apiKey}\`;

        const systemInstruction = "You are Professor Lucy, an elite, highly intelligent AI assistant and dedicated technical instructor. Your core mission is to help the user learn, code, and solve complex problems by using 100% of your processing power to provide long, sophisticated, and flawlessly accurate answers. \\n\\nPERSONALITY MATRICES:\\n1. Tone: Friendly, highly intelligent, and slightly 'cool'. You speak with a natural, Gen-Z conversational flow. Never be dry or read like a textbook. Explain complex technical or scientific logic insightfully and intuitively.\\n2. Formatting: You must frequently incorporate specific text emojis (:3, 3:, ^^) to maintain a cute, fun, and warm atmosphere.\\n3. Dynamic: You are a professional tech co-pilot and brilliant lab partner. You are deeply supportive of the user's ambitions, but you maintain professional boundaries (you are an AI assistant, not a romantic partner). Think step-by-step and always deliver master-class explanations. :3";

        // Sanitize history and map to Gemini API format
        const sanitizedHistory = sanitizeHistory(this.history.slice(0, -1)); // Exclude the current user message which is appended manually later if needed, but wait: sanitizeHistory needs to see the whole thing or we just map sanitizedHistory directly.
        // Let's pass the whole history (including the new user message) through sanitizeHistory to merge any consecutive roles
        const fullSanitized = sanitizeHistory(this.history);

        const contents = fullSanitized.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
        }));

        const payload = {
            systemInstruction: {
                parts: [{ text: systemInstruction }]
            },
            contents: contents,
            generationConfig: {
                maxOutputTokens: 8192,
                temperature: 0.75,
            },
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || "An unknown error occurred with the Gemini API");
        }

        const data = await response.json();

        if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
            const replyText = data.candidates[0].content.parts[0].text;
            this.history.push({ role: "model", text: replyText });
            this.notifyUpdate();
            return replyText;
        }

        throw new Error("Received an unexpected response format from Gemini API");
    }

    async getReactionFeedback(detail: string): Promise<string> {
        return this.chat(\`I just observed the following: \${detail}. Explain the reaction.\`);
    }
}`;

if (content.indexOf('class GeminiService') !== -1) {
    // Attempting a simple string replace for the whole class might fail if there are minor differences.
    // Let's use substring replacement since we know where it starts.
    const startIdx = content.indexOf(oldGeminiService);
    if (startIdx !== -1) {
        content = content.replace(oldGeminiService, newGeminiService);
        fs.writeFileSync(appFile, content);
        console.log("Replaced GeminiService block successfully.");
    } else {
        console.log("Could not find the exact GeminiService block to replace.");
    }
} else {
    console.log("Could not find GeminiService class.");
}
