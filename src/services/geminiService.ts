// src/services/geminiService.ts
import { ChatMessage } from '../types';

interface LabContext {
    containers: any[];
    heaterOn?: boolean;
    event?: string;
}

export class GeminiService {
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

    constructor(apiKey: string | null) {
        this.apiKey = apiKey;
        this.startNewChat();
    }

    private notifyUpdate() {
        if (this.onHistoryUpdate) {
            this.onHistoryUpdate([...this.history]);
        }
    }

    getHistory() {
        return [...this.history];
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

    async chat(message: string, context?: LabContext): Promise<string> {
        this.history.push({ role: "user", text: message });
        this.notifyUpdate();

        // 1. CHECK FOR API KEY
        if (this.apiKey) {
            try {
                return await this.callGeminiAPI(message, context);
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

        if (message.includes("[OBSERVATION]") || (context && context.event === 'REACTION')) {
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

    async callGeminiAPI(userMessage: string, context?: LabContext): Promise<string> {
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`;

        let systemInstruction = `
        Bạn là Giáo sư Lucy, một trợ lý ảo phòng thí nghiệm Gen-Z, năng động, hài hước và am hiểu hóa học.
        Phong cách: Sử dụng emoji (🦊, 🧪, 💥), ngôn ngữ teen (ukie, hoy, nha, :3, ^^), nhưng kiến thức phải chuẩn xác.
        Nhiệm vụ: Giải thích hiện tượng hóa học, cảnh báo an toàn, và reaction khi người dùng làm nổ phòng thí nghiệm.
        Nếu người dùng gửi [OBSERVATION], hãy phân tích phản ứng đó.
        Nếu có cháy nổ, hãy tỏ ra hoảng hốt ([FACE: SHOCKED]).
        Luôn ngắn gọn (dưới 3 câu) vì chatbox nhỏ.
        `;

        if (context) {
            systemInstruction += `
            TRẠNG THÁI PHÒNG LAB HIỆN TẠI:
            - Dụng cụ: ${JSON.stringify(context.containers)}
            - Bếp nhiệt: ${context.heaterOn ? 'BẬT' : 'TẮT'}
            `;
        }

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

        if (!response.ok) throw new Error(`API Error: ${response.status}`);

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "Mất kết nối với vũ trụ rồi! 😵 Thử lại nha!";

        this.history.push({ role: "model", text: text });
        this.notifyUpdate();
        return text;
    }
}
