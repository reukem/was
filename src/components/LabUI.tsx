import React, { useState, useRef, useEffect } from 'react';
import { CHEMICALS, REACTION_REGISTRY } from '../constants';
import { ContainerState, ChatMessage, Quest } from '../types';
import { audioManager } from '../utils/AudioManager';
import { generateReport } from '../utils/ReportGenerator';
import SettingsModal from './SettingsModal';

interface LabUIProps {
    lastReaction: string | null;
    containers: ContainerState[];
    chatHistory: ChatMessage[];
    aiFeedback?: string;
    isAiLoading: boolean;
    quests: Quest[];
    safetyScore?: number;
    isChatOpen: boolean;
    onToggleChat: (isOpen: boolean) => void;
    onSpawn: (chemId: string) => void;
    onReset: () => void;
    onStartExam?: () => void;
    isExamMode?: boolean;
    onUserChat: (msg: string) => void;
    isPerformanceMode: boolean;
    onTogglePerformance: () => void;
    heaterTemp: number;
    onSetHeaterTemp: (t: number) => void;
}

const formatScientificText = (text: string) => {
    if (!text) return null;
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
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-slate-950/60 backdrop-blur-md pointer-events-auto">
            <div className="bg-[#0f172a]/95 border border-white/5 rounded-[2rem] w-[600px] max-h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <h2 className="text-xl font-black text-slate-200 tracking-widest flex items-center gap-2">
                        <span>📖</span> SỔ TAY PHÒNG THÍ NGHIỆM
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors text-2xl leading-none">&times;</button>
                </div>
                <div className="p-8 overflow-y-auto custom-scrollbar">
                    <p className="text-xs text-slate-500 mb-6 font-mono uppercase tracking-[0.2em] border-b border-white/5 pb-2">
                        Dữ Liệu Phản Ứng Đã Ghi Lại
                    </p>
                    <div className="space-y-4">
                        {REACTION_REGISTRY.map((reaction, idx) => (
                            <div key={idx} className="bg-slate-900/50 p-5 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all group">
                                <div className="flex items-center flex-wrap gap-3 mb-3">
                                    <span className="text-xs font-bold text-slate-300 bg-slate-800 px-3 py-1.5 rounded-lg border border-white/5">
                                        {formatScientificText(reaction.reactants[0])}
                                    </span>
                                    <span className="text-slate-600">+</span>
                                    <span className="text-xs font-bold text-slate-300 bg-slate-800 px-3 py-1.5 rounded-lg border border-white/5">
                                        {formatScientificText(reaction.reactants[1])}
                                    </span>
                                    <span className="text-slate-600">→</span>
                                    <span className="text-xs font-bold text-emerald-400 bg-emerald-950/30 px-3 py-1.5 rounded-lg border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                                        {formatScientificText(reaction.product)}
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

const LabUI: React.FC<LabUIProps> = ({
    lastReaction, containers, chatHistory, isAiLoading, quests, safetyScore,
    isChatOpen, onToggleChat, onSpawn, onReset, onStartExam, isExamMode, onUserChat,
    isPerformanceMode, onTogglePerformance, heaterTemp, onSetHeaterTemp
}) => {
    const [chatInput, setChatInput] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isNotebookOpen, setIsNotebookOpen] = useState(false);
    const [isQuestLogOpen, setIsQuestLogOpen] = useState(true);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const handleSubmitChat = (e: React.FormEvent) => {
        e.preventDefault();
        if (chatInput.trim() && !isAiLoading) {
            onUserChat(chatInput);
            setChatInput('');
        }
    };

    const handleExportReport = () => {
        const name = prompt("Nhập tên học sinh:", "Nguyễn Văn A");
        if (!name) return;
        const className = prompt("Nhập lớp:", "12A1");

        generateReport({
            studentName: name,
            className: className || "___",
            date: new Date().toLocaleDateString('vi-VN'),
            safetyScore: safetyScore || 0,
            quests: quests,
            transcript: chatHistory
        });
    };

    useEffect(() => {
        if (isChatOpen) {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatHistory, isChatOpen]);

    return (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 overflow-hidden select-none font-sans text-white">
            <NotebookModal isOpen={isNotebookOpen} onClose={() => setIsNotebookOpen(false)} />
            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

            {/* --- HEADER --- */}
            <div className="flex justify-between items-start pointer-events-auto z-50">
                <div className="flex flex-col gap-3">
                    {/* Main Title Card */}
                    <div className={`bg-[#0f172a]/80 backdrop-blur-xl px-8 py-5 rounded-[2rem] border ${isExamMode ? 'border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.1)]' : 'border-white/5 shadow-2xl'} transition-all duration-500`}>
                        <h1 className={`text-3xl font-black bg-gradient-to-r ${isExamMode ? 'from-red-500 to-orange-500' : 'from-slate-200 via-white to-slate-400'} bg-clip-text text-transparent tracking-tighter drop-shadow-sm`}>
                            {isExamMode ? 'CHEMIC-EXAM' : 'CHEMIC-AI'}
                        </h1>
                        <div className="flex items-center gap-2 mt-1">
                             <div className={`w-1.5 h-1.5 rounded-full ${isExamMode ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                             <p className={`text-[10px] ${isExamMode ? 'text-red-400' : 'text-slate-400'} uppercase tracking-[0.3em] font-bold`}>
                                {isExamMode ? 'GIÁM SÁT KÍCH HOẠT' : 'QUANTUM REALITY ENGINE'}
                            </p>
                        </div>
                    </div>

                    {/* SETTINGS / TOGGLES */}
                    <div className="flex gap-2">
                        {/* Graphics Toggle */}
                        <button
                            onClick={onTogglePerformance}
                            className={`px-4 py-2 rounded-xl border backdrop-blur-md transition-all text-[10px] font-bold uppercase tracking-wider flex items-center gap-2
                                ${isPerformanceMode
                                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                                    : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                                }`}
                            title={isPerformanceMode ? "Chế độ Hiệu Năng (Thấp)" : "Chế độ Đồ Họa Đỉnh Cao (AAA)"}
                        >
                            <span>{isPerformanceMode ? '⚡ FAST' : '💎 AAA'}</span>
                        </button>

                        {/* Settings Button */}
                        <button
                            onClick={() => setIsSettingsOpen(true)}
                            className="px-3 py-2 rounded-xl bg-[#0f172a]/80 backdrop-blur-xl border border-white/5 hover:border-indigo-500/30 text-slate-400 hover:text-white transition-all shadow-lg pointer-events-auto"
                            title="Settings (API Key)"
                        >
                            ⚙️
                        </button>
                    </div>

                    {/* HEATER CONTROL */}
                    <div className="bg-[#0f172a]/80 backdrop-blur-xl border border-orange-500/20 rounded-2xl p-3 shadow-lg flex flex-col gap-1 w-48">
                        <div className="flex justify-between items-center text-[10px] uppercase font-bold text-orange-400 tracking-widest">
                            <span>Bếp Nhiệt</span>
                            <span>{heaterTemp}°C</span>
                        </div>
                        <input
                            type="range"
                            min="25"
                            max="1000"
                            step="25"
                            value={heaterTemp}
                            onChange={(e) => onSetHeaterTemp(Number(e.target.value))}
                            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                        />
                    </div>

                    {/* SAFETY SCORE */}
                    {safetyScore !== undefined && (
                        <div className={`px-5 py-3 rounded-2xl border backdrop-blur-xl shadow-lg transition-all w-fit ${safetyScore < 50 ? 'bg-red-950/80 border-red-500/50 animate-pulse' : 'bg-[#0f172a]/80 border-emerald-500/20'}`}>
                            <p className="text-[9px] uppercase tracking-widest text-slate-500 mb-1 font-bold">An Toàn</p>
                            <p className={`text-2xl font-black ${safetyScore < 50 ? 'text-red-400' : 'text-emerald-400'}`}>{safetyScore}%</p>
                        </div>
                    )}

                    {/* QUEST LOG */}
                    <div className={`transition-all duration-500 ease-out ${isQuestLogOpen ? 'w-72 opacity-100 translate-x-0 pointer-events-auto' : 'w-0 opacity-0 -translate-x-10 overflow-hidden pointer-events-none'}`}>
                        <div className="bg-[#0f172a]/80 backdrop-blur-xl border border-amber-500/10 rounded-2xl p-4 shadow-xl">
                            <div className="flex justify-between items-center mb-3 border-b border-white/5 pb-2">
                                <span className="text-amber-500/80 font-black text-[10px] uppercase tracking-widest">Nhiệm Vụ Hiện Tại</span>
                                <button onClick={() => setIsQuestLogOpen(false)} className="text-slate-600 hover:text-white transition-colors">✕</button>
                            </div>
                            <div className="space-y-2">
                                {quests.map(q => (
                                    <div key={q.id} className={`text-xs p-3 rounded-xl border transition-all ${q.isCompleted ? 'bg-emerald-900/10 border-emerald-500/20 text-emerald-500/50 line-through' : 'bg-slate-800/30 border-white/5 text-slate-300'}`}>
                                        <p className="font-bold mb-1 text-slate-200">{q.title}</p>
                                        <p className="text-[10px] text-slate-500 leading-relaxed">{q.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    {!isQuestLogOpen && (
                        <button
                            onClick={() => setIsQuestLogOpen(true)}
                            className="bg-amber-500/10 text-amber-500 border border-amber-500/20 p-3 rounded-2xl text-xs font-bold uppercase tracking-wider backdrop-blur-md hover:bg-amber-500/20 transition-all text-left w-fit shadow-lg pointer-events-auto z-50"
                        >
                            📋 Nhiệm Vụ ({quests.filter(q => !q.isCompleted).length})
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {!isExamMode && onStartExam && (
                         <button
                            onClick={onStartExam}
                            className="bg-amber-500/5 hover:bg-amber-500/10 text-amber-500 hover:text-amber-400 px-6 py-4 rounded-2xl border border-amber-500/20 transition-all font-black text-[10px] uppercase tracking-[0.2em] backdrop-blur-xl shadow-lg hover:shadow-amber-900/20 hover:-translate-y-0.5"
                        >
                            Bắt Đầu Thi
                        </button>
                    )}
                    <button
                        onClick={handleExportReport}
                        className="bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400 hover:text-emerald-300 w-14 h-14 rounded-2xl border border-emerald-500/20 transition-all font-bold text-xl backdrop-blur-xl shadow-lg hover:shadow-emerald-900/20 hover:-translate-y-0.5 flex items-center justify-center"
                        title="Xuất Báo Cáo"
                    >
                        🖨️
                    </button>
                    <button
                        onClick={() => setIsNotebookOpen(true)}
                        className="bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-400 hover:text-indigo-300 w-14 h-14 rounded-2xl border border-indigo-500/20 transition-all font-bold text-xl backdrop-blur-xl shadow-lg hover:shadow-indigo-900/20 hover:-translate-y-0.5 flex items-center justify-center"
                        title="Mở Sổ Tay"
                    >
                        📖
                    </button>
                    <button
                        onClick={onReset}
                        className="bg-red-500/5 hover:bg-red-500/10 text-red-400 hover:text-red-300 px-6 py-4 rounded-2xl border border-red-500/20 transition-all font-black text-[10px] uppercase tracking-[0.2em] backdrop-blur-xl shadow-lg hover:shadow-red-900/20 hover:-translate-y-0.5"
                    >
                        {isExamMode ? 'THOÁT' : 'RESET'}
                    </button>
                </div>
            </div>

            {/* --- SIDEBAR (Compound Database) --- */}
            {!isExamMode && (
            <div className={`absolute left-6 top-64 bottom-24 w-72 pointer-events-auto transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) z-40 ${isSidebarOpen ? 'translate-x-0 opacity-100' : '-translate-x-[120%] opacity-0 pointer-events-none'}`}>
                <div className="flex justify-between items-center mb-3 px-1">
                    <h2 className="text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] drop-shadow-md">KHO HÓA CHẤT</h2>
                    <button onClick={() => setIsSidebarOpen(false)} className="text-slate-600 hover:text-white transition-colors">✕</button>
                </div>

                <div className="h-full overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-3 pb-4">
                    {/* Apparatus */}
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => onSpawn('BEAKER')}
                            onMouseEnter={() => audioManager.playUIHover()}
                            className="group p-4 rounded-2xl bg-[#0f172a]/60 hover:bg-indigo-500/10 border border-white/5 hover:border-indigo-500/30 transition-all text-left backdrop-blur-md shadow-sm hover:shadow-indigo-900/10"
                        >
                            <span className="text-xs font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">Cốc Thủy Tinh</span>
                            <p className="text-[8px] text-slate-500 mt-1 uppercase tracking-wider">250ml</p>
                        </button>
                        <button
                            onClick={() => onSpawn('TEST_TUBE')}
                            onMouseEnter={() => audioManager.playUIHover()}
                            className="group p-4 rounded-2xl bg-[#0f172a]/60 hover:bg-indigo-500/10 border border-white/5 hover:border-indigo-500/30 transition-all text-left backdrop-blur-md shadow-sm hover:shadow-indigo-900/10"
                        >
                            <span className="text-xs font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">Ống Nghiệm</span>
                            <p className="text-[8px] text-slate-500 mt-1 uppercase tracking-wider">Mẫu thử</p>
                        </button>
                        <button
                            onClick={() => onSpawn('BURETTE')}
                            onMouseEnter={() => audioManager.playUIHover()}
                            className="group p-4 col-span-2 rounded-2xl bg-[#0f172a]/60 hover:bg-indigo-500/10 border border-white/5 hover:border-indigo-500/30 transition-all text-left backdrop-blur-md shadow-sm flex items-center justify-between"
                        >
                            <div>
                                <span className="text-xs font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">Buret Chuẩn Độ</span>
                                <p className="text-[8px] text-slate-500 mt-1 uppercase tracking-wider">50ml • Chính xác cao</p>
                            </div>
                            <span className="text-xl opacity-50 group-hover:opacity-100 transition-opacity">🧪</span>
                        </button>
                    </div>

                    <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-2" />

                    {/* Chemicals */}
                    {Object.values(CHEMICALS).map(chem => (
                        <button
                            key={chem.id}
                            onClick={() => onSpawn(chem.id)}
                            onMouseEnter={() => audioManager.playUIHover()}
                            className="group relative p-4 rounded-2xl bg-[#0f172a]/40 hover:bg-slate-800/80 border border-white/5 hover:border-indigo-500/30 transition-all text-left backdrop-blur-sm shadow-sm hover:translate-x-1"
                        >
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[11px] font-bold text-slate-300 group-hover:text-white transition-colors">{chem.name}</span>
                                <div
                                    className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.2)] ring-1 ring-white/10"
                                    style={{ backgroundColor: chem.color }}
                                ></div>
                            </div>
                            <span className="text-[9px] font-mono text-slate-500 group-hover:text-indigo-400 tracking-tighter transition-colors">
                                {formatScientificText(chem.formula)}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
            )}

            {!isSidebarOpen && !isExamMode && (
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="absolute left-6 top-64 pointer-events-auto bg-[#0f172a]/80 p-4 rounded-2xl border border-white/10 text-slate-400 hover:text-white transition-all shadow-xl z-40 hover:scale-105"
                >
                    <span className="writing-vertical text-[10px] font-black uppercase tracking-[0.3em]">Kho</span>
                </button>
            )}

            {/* --- REACTION ALERT (Floating Centered) --- */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none w-full flex justify-center z-30">
                {lastReaction && (
                    <div className="animate-in fade-in zoom-in duration-500 slide-in-from-bottom-8 bg-[#0f172a]/95 backdrop-blur-3xl border border-orange-500/30 p-10 rounded-[2.5rem] shadow-2xl text-center max-w-lg ring-1 ring-orange-500/10">
                        <p className="text-orange-400 font-bold text-[10px] uppercase tracking-[0.3em] mb-4">Phát Hiện Phản Ứng</p>
                        <p className="text-white text-lg font-medium leading-relaxed tracking-tight shadow-sm">
                            {isExamMode ? 'Phản ứng đã xảy ra! Quan sát hiện tượng và ghi lại.' : formatScientificText(lastReaction)}
                        </p>
                    </div>
                )}
            </div>

            {/* --- FOOTER / STATUS BAR --- */}
            <div className="absolute bottom-8 left-0 w-full flex justify-center pointer-events-none z-30">
                <div className="flex justify-center text-slate-500 text-[9px] font-mono gap-16 bg-[#0f172a]/80 backdrop-blur-xl py-4 px-12 rounded-full border border-white/5 pointer-events-auto shadow-2xl tracking-widest uppercase">
                    <span className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"/> SYSTEM_ONLINE</span>
                    <span>ENTITIES: {containers.length}</span>
                    <span className="text-slate-600">GEMINI_CORE_v1.5</span>
                </div>
            </div>

            {/* --- CHAT INTERFACE (Professor Gemini) --- */}
            <div className="absolute right-8 bottom-8 pointer-events-auto z-50 flex flex-col items-end gap-4">

                {/* Minimized Button "Comm Link" */}
                {!isChatOpen && (
                    <button
                        onClick={() => onToggleChat(true)}
                        className="bg-[#0f172a]/80 backdrop-blur-xl border border-indigo-500/20 p-4 rounded-[2rem] shadow-2xl hover:bg-indigo-900/20 transition-all group flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 hover:-translate-y-1"
                    >
                        <div className="w-12 h-12 bg-slate-800/50 rounded-2xl flex items-center justify-center text-2xl shadow-inner border border-white/5 group-hover:scale-110 transition-transform">
                            🎓
                        </div>
                        <div className="text-left pr-2">
                            <div className="text-xs font-bold text-indigo-300 mb-0.5">Liên Lạc</div>
                            <div className="text-[9px] text-slate-500 uppercase tracking-widest">Giáo Sư Lucy</div>
                        </div>
                    </button>
                )}

                {/* Expanded Chat Window */}
                {isChatOpen && (
                    <div className="w-[26rem] h-[36rem] bg-[#0f172a]/95 backdrop-blur-3xl border border-indigo-500/20 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-300 ring-1 ring-white/5">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors" onClick={() => onToggleChat(false)}>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-xl shadow-inner border border-white/5">
                                    👩‍🔬
                                </div>
                                <div>
                                    <h3 className="text-white font-bold text-sm tracking-tight">Giáo Sư Lucy</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className={`w-1.5 h-1.5 rounded-full ${isAiLoading ? 'bg-amber-400 animate-bounce' : 'bg-emerald-500 shadow-[0_0_8px_#10b981]'}`}></div>
                                        <span className="text-[9px] text-slate-400 font-mono uppercase tracking-widest">
                                            {isAiLoading ? 'THINKING...' : 'ONLINE'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => onToggleChat(false)} className="text-slate-500 hover:text-white p-2 rounded-full hover:bg-white/5">✕</button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 custom-scrollbar">
                            {chatHistory.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] p-4 rounded-3xl text-[13px] leading-relaxed whitespace-pre-wrap shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none shadow-indigo-900/20' : 'bg-slate-800/50 text-slate-200 rounded-bl-none border border-white/5'}`}>
                                        {formatScientificText(msg.text)}
                                    </div>
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Input */}
                        <form onSubmit={handleSubmitChat} className="p-4 bg-slate-900/50 border-t border-white/5">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    placeholder="Đặt câu hỏi..."
                                    className="w-full bg-slate-950/50 text-slate-200 text-sm px-5 py-4 rounded-2xl border border-white/10 focus:border-indigo-500/50 focus:outline-none transition-all placeholder-slate-600 pr-12 focus:ring-1 focus:ring-indigo-500/20"
                                />
                                <button
                                    type="submit"
                                    disabled={isAiLoading || !chatInput.trim()}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    ➤
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LabUI;
