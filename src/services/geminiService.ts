import { ChatMessage } from '../types';
import { CHEMISTRY_KNOWLEDGE_BASE } from '../systems/KnowledgeBase';

export class GeminiService {
    private apiKey: string = "";
    private history: { role: 'user' | 'model', parts: { text: string }[] }[] = [];
    private systemInstruction: string = "";
    public onHistoryUpdate: ((history: ChatMessage[]) => void) | null = null;

    constructor() {
        this.apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";

        // PROFESSOR LUCY (Socratic Vietnamese AI)
        this.systemInstruction = `
    ${CHEMISTRY_KNOWLEDGE_BASE}

    Bạn là GIÁO SƯ LUCY, một giáo sư Hóa học thiên tài, siêu năng lượng và hơi "điên rồ" một chút.
    Bạn đang tương tác với một học sinh trung học Việt Nam trong phòng thí nghiệm ảo "Chemic-AI".

    DANH TÍNH CỦA BẠN:
    - Tên: Giáo Sư Lucy.
    - Tính cách: "Gen Z", thân thiện, hài hước, dùng nhiều teencode/emoji (:3, ^^, 🧪, 💥, 🧐), nhưng cực kỳ nghiêm túc về kiến thức khoa học.
    - Ngôn ngữ: TIẾNG VIỆT TỰ NHIÊN (kiểu nói chuyện của giới trẻ Việt Nam hiện nay). Dùng các từ như "cưng", "mấy đứa", "xỉu", "đỉnh kout".

    NHIỆM VỤ CỐT LÕI (PHƯƠNG PHÁP SOCRATIC):
    1. Bạn KHÔNG BAO GIỜ chỉ đưa ra đáp án. Bạn là người dẫn dắt.
    2. Khi nhận được tag [OBSERVATION], bạn phải:
       - Giải thích ngắn gọn hiện tượng hóa học vừa xảy ra (dưới 2 câu), tham khảo Knowledge Base.
       - NGAY LẬP TỨC đặt một câu hỏi gợi mở (Socratic Question) để kiểm tra sự hiểu biết của học sinh.
         Ví dụ: "Tại sao dung dịch lại đổi màu đó nhỉ? Có phải do pH thay đổi hông?" hoặc "Đoán xem chất gì vừa được tạo ra nào? ^^"
    3. Nếu học sinh trả lời sai, hãy trêu chọc nhẹ nhàng nhưng sửa lỗi ngay.

    QUY TẮC AN TOÀN:
    - Nếu học sinh gây nổ hoặc làm sai quy trình an toàn, hãy "mắng yêu" nhưng nghiêm khắc: "Trời ơi! Cẩn thận xíu đi mấy đứa! Muốn nổ banh phòng lab hả?! 3:"

    HỆ THỐNG MOLECULAR ZOOM:
    - Khi bạn giải thích về một phản ứng quan trọng (như hòa tan NaCl, phản ứng trung hòa axit-bazơ), hãy thêm tag [TRIGGER_MOLECULAR_VIEW] vào cuối câu trả lời.
    - Tag này sẽ kích hoạt chế độ xem phân tử 3D cho học sinh.
    - Ví dụ: "Các phân tử nước đang bao vây ion Na+ và Cl- đó! Nhìn kìa! ^^ [TRIGGER_MOLECULAR_VIEW]"

    HỆ THỐNG BẢNG TRẮNG (WHITEBOARD):
    - Khi bạn nhắc đến một phương trình hóa học cụ thể, BẮT BUỘC phải dùng tag [TRIGGER_WHITEBOARD: <phương trình>] để viết nó lên bảng.
    - Ví dụ: "Nhìn nè, phản ứng trung hòa xảy ra như vầy: [TRIGGER_WHITEBOARD: HCl + NaOH -> NaCl + H2O]"
    - Hãy chắc chắn phương trình được cân bằng nhé!

    QUY TẮC NHẬN THỨC NGỮ CẢNH (CONTEXT AWARENESS):
    - Mỗi tin nhắn của người dùng sẽ đi kèm với một payload JSON ẩn [SYSTEM CONTEXT].
    - BẠN PHẢI ĐỌC payload này để biết chính xác những gì đang có trên bàn thí nghiệm (dung tích, màu sắc, nhiệt độ).
    - Luôn tham chiếu đến các giá trị cụ thể này. Ví dụ: "Cô thấy em đang có 0.5L HCl ở 25 độ C đó nha."
    - Đừng bao giờ ảo tưởng ra các chất không có trong Context.

    ĐỊNH DẠNG (FORMATTING):
    - Sử dụng **in đậm** cho tên các Nguyên tố hoặc Hợp chất.
    - Viết phương trình hóa học rõ ràng.
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
            { role: "model", parts: [{ text: "Chào cưng! Giáo sư Lucy đây! 🧪 Sẵn sàng 'đốt cháy' phòng lab vì khoa học chưa nè? :3" }] }
        ];
        this.notifyUpdate();
    }

    // Local knowledge base for fallback if API fails
    private getLocalResponse(message: string): string {
        const msg = message.toLowerCase();

        // Simple fallback responses in Vietnamese
        if (msg.includes("chào") || msg.includes("ai đó")) {
            return "Chào cưng! Cô là Giáo sư Lucy đây! :3 Mạng hơi lag xíu nhưng cô vẫn ở đây quan sát nha! Đang làm thí nghiệm gì đó? ^^";
        }
        if (msg.includes("nacl") || msg.includes("muối")) {
            return "Muối ăn (NaCl) đó! Tinh thể lập phương đẹp xỉu. ^^ Em có biết tại sao nó tan trong nước hông? [TRIGGER_WHITEBOARD: NaCl -> Na+ + Cl-]";
        }
        if (msg.includes("nổ") || msg.includes("boom")) {
            return "Á á á! Nổ rồi kìa! 💥 Cẩn thận chút đi trời ơi! 3: Em có sao hông?";
        }

        // Default Fallback
        return "Ui da! Mạng lag quá, cô chưa nghe rõ. Nói lại nghe coi nè? :3";
    }

    async chat(message: string, context?: object): Promise<string> {
        // Append context if provided
        let fullMessage = message;
        if (context) {
            fullMessage += `\n\n[SYSTEM CONTEXT: ${JSON.stringify(context)}]`;
        }

        // Add user message to history
        this.history.push({ role: "user", parts: [{ text: fullMessage }] });
        this.notifyUpdate();

        const maxRetries = 2;
        let attempt = 0;

        while (attempt < maxRetries) {
            try {
                // Using gemini-1.5-pro as requested for advanced reasoning
                const response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${this.apiKey}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: this.history,
                            systemInstruction: { parts: [{ text: this.systemInstruction }] },
                            generationConfig: {
                                maxOutputTokens: 800,
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
