import React, { useState, useCallback, useRef, useEffect } from 'react';
import SettingsModal from './components/SettingsModal';
import LabScene from './components/LabScene';
import { ChemistryEngine } from './systems/ChemistryEngine';
import { CHEMICALS, REACTION_REGISTRY } from './constants';
import { ContainerState, ChatMessage, ReactionResult } from './types';

// -----------------------------------------------------------------------------
// 1. SYSTEMS: GEMINI SERVICE (LIVE + OFFLINE FALLBACK)
// -----------------------------------------------------------------------------

class GeminiService {
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
        try {
            const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`;

            const systemInstruction = `System: You are Professor Lucy, an intelligent, Gen-Z AI chemistry assistant. Use emojis (:3, ^^). If the user asks general questions (like 2+2), answer them cleverly. If the user asks about chemistry, provide accurate scientific explanations based on the current lab state.`;

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
        } catch (error) {
            console.error("Gemini API Error:", error);
            const fallback = "Oups! Mất kết nối với Neural Core rồi... 😵 Thử lại xíu nữa nha! (Check API Key nữa nhé)";
            this.history.push({ role: "model", text: fallback });
            this.notifyUpdate();
            return fallback;
        }
    }

    async getReactionFeedback(detail: string): Promise<string> {
        return this.chat(`[OBSERVATION] ${detail}`);
    }
}

// -----------------------------------------------------------------------------
// 2. COMPONENT: LAB UI
// -----------------------------------------------------------------------------

const formatScientificText = (text: string) => {
    const parts = text.split(/(\d+)/g);
    return parts.map((part, index) => {
        if (index % 2 === 1) {
            return <sub key={index} className="text-[0.7em] align-baseline">{part}</sub>;
        }
        return part;
    });
};

const NotebookModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-slate-950/60 backdrop-blur-md">
            <div className="bg-slate-900 border border-white/10 rounded-3xl w-[600px] max-h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <h2 className="text-xl font-black text-slate-200 tracking-widest flex items-center gap-2">
                        <span>📖</span> NHẬT KÝ THÍ NGHIỆM
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors text-2xl leading-none">&times;</button>
                </div>
                <div className="p-8 overflow-y-auto custom-scrollbar">
                    <p className="text-xs text-slate-500 mb-6 font-mono uppercase tracking-[0.2em] border-b border-white/5 pb-2">
                        KHU VỰC HẠN CHẾ. DỮ LIỆU PHẢN ỨNG ĐƯỢC GHI LẠI.
                    </p>
                    <div className="space-y-4">
                        {REACTION_REGISTRY.map((reaction, idx) => (
                            <div key={idx} className="bg-slate-950/50 p-5 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all group">
                                <div className="flex items-center flex-wrap gap-3 mb-3">
                                    <span className="text-xs font-bold text-slate-300 bg-slate-800 px-3 py-1.5 rounded-lg border border-white/5">
                                        {reaction.reactants[0]}
                                    </span>
                                    <span className="text-slate-600">+</span>
                                    <span className="text-xs font-bold text-slate-300 bg-slate-800 px-3 py-1.5 rounded-lg border border-white/5">
                                        {reaction.reactants[1]}
                                    </span>
                                    <span className="text-slate-600">→</span>
                                    <span className="text-xs font-bold text-emerald-400 bg-emerald-950/30 px-3 py-1.5 rounded-lg border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                                        {reaction.product}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400 italic border-l-2 border-slate-700 pl-3 group-hover:text-slate-300 transition-colors">
                                    "{formatScientificText(reaction.message)}"
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// -- UI COMPONENT: HOLOGRAPHIC AVATAR --
const HolographicAvatar: React.FC<{
    isExpanded: boolean;
    setIsExpanded: (v: boolean) => void;
    chatHistory: ChatMessage[];
    isAiLoading: boolean;
    chatInput: string;
    setChatInput: (v: string) => void;
    onSubmit: (e: React.FormEvent) => void;
    avatarState: 'normal' | 'shocked';
}> = ({ isExpanded, setIsExpanded, chatHistory, isAiLoading, chatInput, setChatInput, onSubmit, avatarState }) => {
    const chatEndRef = useRef<HTMLDivElement>(null);
    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatHistory, isExpanded]);

    const avatarSrc = avatarState === 'shocked' ? '/lucy_shocked.png' : '/lucy.png';

    return (
        <div className="absolute bottom-6 right-6 z-50 pointer-events-auto flex flex-col items-end gap-3">
             {/* MODULE 3: Bottom-Right (Professor Lucy Interface) */}
             <div className="w-80 bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                 <div className="p-4 border-b border-white/5 flex items-center gap-3">
                     {/* PERFECT SQUARE AVATAR */}
                     <img src={avatarSrc} className="w-12 h-12 aspect-square object-cover rounded-md border border-orange-500 shrink-0 shadow-[0_0_10px_rgba(249,115,22,0.3)] transition-all duration-300" alt="Prof Lucy" />
                     <div>
                         <h3 className="text-sm font-bold text-white tracking-wide">Liên Lạc - GIÁO SƯ LUCY</h3>
                         <div className="flex items-center gap-1.5 mt-0.5">
                             <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                             <span className="text-[10px] text-emerald-400 font-bold tracking-wider">ONLINE</span>
                         </div>
                     </div>
                 </div>

                 <div className="h-64 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-slate-950/30">
                     {chatHistory.map((msg, i) => (
                         <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                             <div className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
                                 msg.role === 'user'
                                 ? 'bg-orange-900/40 text-orange-50 border border-orange-700/50 rounded-tr-none'
                                 : 'bg-slate-800/80 text-slate-300 border border-slate-700 rounded-tl-none'
                             }`}>
                                 {msg.text.replace(/\[FACE:.*?\]/g, '')}
                             </div>
                         </div>
                     ))}
                     {isAiLoading && <div className="text-[10px] text-slate-500 italic animate-pulse">Đang suy nghĩ...</div>}
                     <div ref={chatEndRef} />
                 </div>

                 <form onSubmit={onSubmit} className="p-3 bg-slate-900/50 border-t border-white/5">
                     <div className="relative">
                         <input
                             type="text"
                             value={chatInput}
                             onChange={(e) => setChatInput(e.target.value)}
                             placeholder="Hỏi Lucy..."
                             className="w-full bg-slate-950 border border-slate-700/80 rounded-xl py-2.5 px-4 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
                         />
                     </div>
                 </form>
             </div>
        </div>
    );
};

const LabUI: React.FC<{
    lastReaction: string | null;
    containers: ContainerState[];
    chatHistory: ChatMessage[];
    aiFeedback?: string;
    isAiLoading: boolean;
    onSpawn: (chemId: string) => void;
    onReset: () => void;
    onChat: (message: string) => void;
    // MODULE 2: Lifted State
    heaterTemp: number;
    setHeaterTemp: (val: number) => void;
    avatarState: 'normal' | 'shocked';
}> = ({ lastReaction, containers, chatHistory, isAiLoading, onSpawn, onReset, onChat, heaterTemp, setHeaterTemp, avatarState }) => {
    const [chatInput, setChatInput] = useState("");
    const [isNotebookOpen, setIsNotebookOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (chatInput.trim()) {
            onChat(chatInput);
            setChatInput("");
        }
    };

    return (
        <div className="absolute inset-0 z-[999999] pointer-events-none overflow-hidden select-none font-sans">
            {/* MODULE 3: Global Wrapper */}

            {/* 1. GLOBAL MODALS (Pointer Events Auto) */}
            <div className="pointer-events-auto">
                <NotebookModal isOpen={isNotebookOpen} onClose={() => setIsNotebookOpen(false)} />
                <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
            </div>

            {/* MODULE 3: Top-Left (Command Header) */}
            <div className="absolute top-6 left-6 pointer-events-auto flex flex-col gap-4">
                <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-[2rem] p-5 shadow-2xl">
                    <h1 className="text-4xl font-mono font-extrabold text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] tracking-[0.1em]">
                        CHEMIC-AI
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                        <span className="text-[10px] tracking-[0.3em] text-slate-300 font-bold">QUANTUM REALITY ENGINE</span>
                    </div>
                    <div className="flex gap-2 mt-3">
                         <button className="border border-blue-500/50 text-blue-400 rounded-xl px-3 py-1 text-xs font-bold hover:bg-blue-500/10 transition-colors">
                             💎 AAA
                         </button>
                         <button onClick={() => setIsSettingsOpen(true)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl p-2 transition-colors">
                             ⚙️
                         </button>
                    </div>
                </div>

                {/* Thermal Slider */}
                <div className="bg-slate-900/80 backdrop-blur-md border border-orange-500/30 rounded-xl p-3 w-64 shadow-xl">
                     <div className="flex justify-between items-center mb-2">
                         <span className="text-[10px] font-bold text-orange-500 tracking-wider">BẾP NHIỆT</span>
                         <span className="text-xs font-mono text-white">{heaterTemp}°C</span>
                     </div>
                     <input
                        type="range"
                        min="25"
                        max="1000"
                        step="25"
                        value={heaterTemp}
                        onChange={(e) => setHeaterTemp(Number(e.target.value))}
                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                     />
                </div>
            </div>

            {/* MID-LEFT: QUESTS */}
            <div className="absolute top-1/2 left-6 transform -translate-y-1/2 w-64 pointer-events-auto">
                 {/* Safety Indicator */}
                 <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-emerald-500/30 p-3 flex items-center justify-between shadow-lg mb-4">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">TRẠNG THÁI</span>
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                          AN TOÀN <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                      </span>
                 </div>

                 {/* Quest Board */}
                 <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-700/50 shadow-2xl p-4">
                    <h2 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-3 border-b border-white/5 pb-2">
                        TIẾN ĐỘ (3)
                    </h2>
                    <div className="text-[10px] text-slate-400 space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                            <span>Tổng hợp Natri Clorua (Muối)</span>
                        </div>
                        <div className="flex items-center gap-2 opacity-50">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                            <span>Phân tích độ pH</span>
                        </div>
                         <div className="flex items-center gap-2 opacity-50">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                            <span>Ghi chép quan sát</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* BOTTOM-LEFT: INVENTORY */}
            <div className="absolute bottom-6 left-6 w-64 pointer-events-auto flex flex-col gap-4">
                <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-700/50 shadow-2xl h-80 flex flex-col">
                    <div className="p-3 bg-white/5 border-b border-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        KHO HÓA CHẤT
                    </div>
                    <div className="overflow-y-auto custom-scrollbar p-3 space-y-3">
                         <button
                            onClick={() => onSpawn('BEAKER')}
                            className="w-full text-left p-4 rounded-xl bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 hover:border-orange-500/50 hover:bg-slate-800 transition-all group flex items-center justify-between shadow-lg"
                         >
                            <div>
                                <div className="text-xs font-bold text-slate-200 group-hover:text-orange-400 transition-colors">Cốc Thí Nghiệm</div>
                                <div className="text-[10px] font-mono text-slate-500 mt-1">Dụng cụ chứa</div>
                            </div>
                            <span className="w-2 h-2 border border-slate-500 rounded-full group-hover:bg-slate-500 transition-colors"></span>
                         </button>

                         {Object.values(CHEMICALS).map(chem => (
                             <button
                                key={chem.id}
                                onClick={() => onSpawn(chem.id)}
                                className="w-full text-left p-4 rounded-xl bg-slate-900/80 backdrop-blur-sm border border-orange-900/30 hover:border-orange-500/50 hover:bg-slate-800 transition-all group flex items-center justify-between shadow-lg"
                             >
                                <div>
                                    <div className="text-xs font-bold text-slate-200 group-hover:text-orange-400 transition-colors">{chem.name}</div>
                                    <div className="text-[10px] font-mono text-slate-500 mt-1">{chem.formula}</div>
                                </div>
                                <span
                                    className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] opacity-60 group-hover:opacity-100 transition-opacity"
                                    style={{ backgroundColor: chem.color, boxShadow: `0 0 10px ${chem.color}` }}
                                ></span>
                             </button>
                         ))}
                    </div>
                </div>
            </div>

            {/* MODULE 3: Top-Right (Action Deck) */}
            <div className="absolute top-6 right-6 flex items-center gap-3 pointer-events-auto">
                 <button className="bg-slate-900/80 backdrop-blur-md border border-orange-500/50 text-orange-400 text-xs font-bold px-5 py-2.5 rounded-full shadow-lg hover:bg-orange-500/10 transition-all hover:scale-105 active:scale-95">
                     BẮT ĐẦU THI
                 </button>
                 <button onClick={() => setIsNotebookOpen(true)} className="w-10 h-10 bg-[#0f172a]/80 backdrop-blur-md rounded-full border border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-white hover:border-white/20 transition-all shadow-lg">
                     📖
                 </button>
                 <button onClick={onReset} className="w-10 h-10 bg-[#0f172a]/80 backdrop-blur-md rounded-full border border-slate-700/50 flex items-center justify-center text-red-400 hover:text-red-300 hover:border-red-500/30 transition-all shadow-lg">
                     ⟳
                 </button>
            </div>

            {/* MODULE 4: Notification Alignment Matrix */}
            <div className="absolute top-12 left-1/2 transform -translate-x-1/2 z-50 flex flex-col items-center pointer-events-none">
                {lastReaction && (
                    <div className="bg-slate-900/90 backdrop-blur-xl border border-orange-500/30 px-8 py-4 rounded-2xl shadow-[0_0_40px_rgba(249,115,22,0.3)] animate-in fade-in slide-in-from-top-4">
                         <p className="text-orange-400 font-bold text-xs uppercase tracking-[0.2em] text-center mb-1">PHÁT HIỆN PHẢN ỨNG</p>
                         <p className="text-white text-sm font-mono text-center">{formatScientificText(lastReaction)}</p>
                    </div>
                )}
            </div>

            {/* Bottom Status Bar */}
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 pointer-events-auto">
                <div className="bg-[#0f172a]/80 backdrop-blur-md border border-slate-700/50 rounded-full px-4 py-1.5 flex items-center gap-4 text-[10px] font-mono text-slate-500 shadow-xl">
                    <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>HỆ_THỐNG_ONLINE</span>
                    <span className="opacity-30">|</span>
                    <span>THỰC THỂ: {containers.length}</span>
                    <span className="opacity-30">|</span>
                    <span>NEURAL_CORE_V1.5 (GEMINI)</span>
                </div>
            </div>

            <HolographicAvatar
                isExpanded={true} // Always expanded as per "w-80" request? Or allows toggle. I'll allow toggle but default open.
                setIsExpanded={() => {}}
                chatHistory={chatHistory}
                isAiLoading={isAiLoading}
                chatInput={chatInput}
                setChatInput={setChatInput}
                onSubmit={handleSubmit}
                avatarState={avatarState}
            />
        </div>
    );
};

// -----------------------------------------------------------------------------
// 3. MAIN APP COMPONENT
// -----------------------------------------------------------------------------

export default function App() {
    console.log("--- APP V5 RELOADED ---");
    const aiServiceRef = useRef<GeminiService | null>(null);
    const reactionTimeoutRef = useRef<number | null>(null);
    const [lastEffectPos, setLastEffectPos] = useState<[number, number, number] | null>(null);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

    // MODULE 2: Lifted Heater State
    const [heaterTemp, setHeaterTemp] = useState(300);
    const [avatarState, setAvatarState] = useState<'normal' | 'shocked'>('normal');

    const initialContainers: ContainerState[] = [
        { id: 'beaker-1', position: [-1.5, 0.42, 0], contents: { chemicalId: 'H2O', volume: 0.6, color: CHEMICALS['H2O'].color, temperature: 25 } },
        { id: 'beaker-2', position: [1.5, 0.11, 0], contents: null }
    ];
    const [containers, setContainers] = useState<ContainerState[]>(initialContainers);
    const [lastReaction, setLastReaction] = useState<string | null>(null);
    const [lastEffect, setLastEffect] = useState<string | null>(null);
    const [aiFeedback, setAiFeedback] = useState<string>("Chào mừng bạn đến với phòng thí nghiệm. Tôi là Giáo sư Lucy.");
    const [isAiLoading, setIsAiLoading] = useState(false);

    useEffect(() => {
        const service = new GeminiService();
        service.onHistoryUpdate = (history) => {
            setChatHistory([...history]);
            if (history.length > 0 && (history[history.length - 1].role === 'assistant' || history[history.length - 1].role === 'model')) {
                const text = history[history.length - 1].text;
                setAiFeedback(text);
                if (text.includes('[FACE: SHOCKED]')) {
                    setAvatarState('shocked');
                } else if (!lastEffect) {
                    setAvatarState('normal');
                }
            }
        };
        aiServiceRef.current = service;
        // Sync initial history
        setChatHistory([...service['history'].map(h => ({ role: h.role, text: h.text }))]);

        return () => { if (reactionTimeoutRef.current) window.clearTimeout(reactionTimeoutRef.current); };
    }, []);

    // MODULE 2: Reaction-based Avatar State
    useEffect(() => {
        if (lastEffect === 'explosion' || lastEffect === 'smoke') {
            setAvatarState('shocked');
        } else {
            setAvatarState('normal');
        }
    }, [lastEffect]);

    const handleMoveContainer = useCallback((id: string, position: [number, number, number]) => {
        setContainers(prev => prev.map(c => c.id === id ? { ...c, position } : c));
    }, []);

    const handleChat = async (message: string) => {
        if (!aiServiceRef.current) return;
        setIsAiLoading(true);
        await aiServiceRef.current.chat(message);
        setIsAiLoading(false);
    };

    const handlePour = useCallback(async (sourceId: string, targetId: string) => {
        const source = containers.find(c => c.id === sourceId);
        const target = containers.find(c => c.id === targetId);
        if (!source || !target || !source.contents) return;

        const isSourceItem = sourceId.startsWith('source_');
        const sourceChem = CHEMICALS[source.contents.chemicalId];
        const amountToPour = sourceChem.type === 'solid' ? 0.3 : Math.min(0.2, source.contents.volume);
        if (amountToPour <= 0) return;

        const targetChemId = target.contents ? target.contents.chemicalId : 'H2O';
        const targetVol = target.contents ? target.contents.volume : 0;
        // MODULE 2: Pass Heater Temp to Reaction Logic (Ambient Temp)
        const targetTemp = target.contents?.temperature || heaterTemp;

        // Pass ambient temp (heaterTemp) to mix function for activation energy check
        const mixResult = ChemistryEngine.mix(targetChemId, targetVol, source.contents.chemicalId, amountToPour, heaterTemp);

        setContainers(prev => {
            const isReactionProduct = !!mixResult.reaction;
            const newTemp = mixResult.reaction?.temperature || targetTemp;
            const nextContainers = prev.map(c => {
                if (c.id === sourceId && !isSourceItem) {
                    const newVol = Math.max(0, c.contents!.volume - amountToPour);
                    return { ...c, contents: newVol < 0.05 ? null : { ...c.contents!, volume: newVol } };
                }
                if (c.id === targetId) {
                     return { ...c, contents: { chemicalId: mixResult.resultId, volume: Math.min(1.0, targetVol + amountToPour), color: mixResult.resultColor, temperature: isReactionProduct ? newTemp : targetTemp } };
                }
                return c;
            });
            return nextContainers.filter(c => {
                 if (c.id === sourceId) {
                     if (isReactionProduct) return false;
                     if (!isSourceItem && c.contents === null) return false;
                 }
                 return true;
            });
        });

        if (mixResult.reaction) {
            setLastReaction(mixResult.reaction.message);
            setLastEffect(mixResult.reaction.effect || null);
            setLastEffectPos(target.position);

            if (reactionTimeoutRef.current) window.clearTimeout(reactionTimeoutRef.current);
            reactionTimeoutRef.current = window.setTimeout(() => {
                setLastReaction(null);
                setLastEffect(null);
                setLastEffectPos(null);
            }, 6000);

            if (aiServiceRef.current) {
                setIsAiLoading(true);
                const detail = `Đã trộn ${CHEMICALS[source.contents.chemicalId].name} vào ${CHEMICALS[targetChemId].name} ở ${heaterTemp}°C. Tạo ra ${mixResult.reaction.productName}.`;
                await aiServiceRef.current.getReactionFeedback(detail);
                setIsAiLoading(false);
            }
        }
    }, [containers, heaterTemp]); // Add heaterTemp to dependencies

    const handleDrop = useCallback((sourceId: string, targetId: string) => {
        console.log(`[PHYSICS] Dropping ${sourceId} into ${targetId}!`);
        handlePour(sourceId, targetId);
    }, [handlePour]);

    const handleSpawn = (chemId: string) => {
        const isBeaker = chemId === 'BEAKER';
        const newId = isBeaker ? `beaker-${Date.now()}` : `source_${chemId}_${Date.now()}`;
        const chem = CHEMICALS[chemId];
        const x = (Math.random() - 0.5) * 6;
        const y = isBeaker ? 0.11 : 0.56;
        const z = isBeaker ? (Math.random() * 2) : -3.5;
        setContainers(prev => [...prev, { id: newId, position: [x, y, z], initialPosition: isBeaker ? undefined : [x, y, z], contents: isBeaker ? null : { chemicalId: chemId, volume: 1.0, color: chem.color, temperature: 25 } }]);
    };

    const handleReset = () => {
        setContainers(initialContainers);
        setLastReaction(null);
        setLastEffect(null);
        setLastEffectPos(null);
        setAiFeedback("Phòng thí nghiệm đã được khử trùng. Bạn có thể tiếp tục nghiên cứu.");
        setAvatarState('normal');
        if(aiServiceRef.current) aiServiceRef.current.startNewChat();
    };

    return (
        <div className={`relative w-full h-screen overflow-hidden transition-all duration-300 ${lastEffect === 'explosion' ? 'brightness-125' : ''}`}>
            {/* Gradient Background: Sky Blue -> Soft Pink -> Sunset Orange */}
            <div className="absolute inset-0 bg-gradient-to-b from-sky-300 via-pink-200 to-orange-300" />

            {/* Background Texture */}
            <div className="absolute inset-0 bg-tech-grid opacity-10 pointer-events-none mix-blend-overlay" />

            <LabScene
                heaterTemp={heaterTemp}
                containers={containers}
                lastEffect={lastEffect}
                lastEffectPos={lastEffectPos}
                onMove={handleMoveContainer}
                onPour={handlePour}
                onDrop={handleDrop}
            />
            <LabUI
                lastReaction={lastReaction}
                containers={containers}
                chatHistory={chatHistory}
                aiFeedback={aiFeedback}
                isAiLoading={isAiLoading}
                onSpawn={handleSpawn}
                onReset={handleReset}
                onChat={handleChat}
                heaterTemp={heaterTemp}
                setHeaterTemp={setHeaterTemp}
                avatarState={avatarState}
            />
        </div>
    );
}
