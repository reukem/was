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
        <div className="absolute inset-0 z-50" style={{ pointerEvents: 'none' }}>
            {/* SIDEBAR INVENTORY */}
            <div className={`absolute left-0 top-0 h-full w-72 pointer-events-auto transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`} style={{ pointerEvents: 'auto' }}>
                {/* Re-implementing sidebar content here to ensure it's captured */}
                {!isExamMode && (
                    <div className="h-full bg-slate-900/90 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-slate-400 font-black text-xs uppercase tracking-[0.2em]">KHO HÓA CHẤT</h2>
                            <button onClick={() => setIsSidebarOpen(false)} className="text-slate-500 hover:text-white transition-colors">✕</button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                             {/* Apparatus */}
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => onSpawn('BEAKER')} className="p-4 rounded-xl bg-white/5 hover:bg-indigo-600/20 border border-white/10 hover:border-indigo-500/50 transition-all text-left">
                                    <span className="text-xs font-bold text-slate-200">Cốc</span>
                                </button>
                                <button onClick={() => onSpawn('TEST_TUBE')} className="p-4 rounded-xl bg-white/5 hover:bg-indigo-600/20 border border-white/10 hover:border-indigo-500/50 transition-all text-left">
                                    <span className="text-xs font-bold text-slate-200">Ống</span>
                                </button>
                            </div>
                            <div className="h-px bg-white/10 my-4" />
                            {Object.values(CHEMICALS).map(chem => (
                                <button
                                    key={chem.id}
                                    onClick={() => onSpawn(chem.id)}
                                    className="w-full p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-left flex items-center justify-between group"
                                >
                                    <span className="text-xs font-bold text-slate-300 group-hover:text-white">{chem.name}</span>
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: chem.color }} />
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* HEADER CONTROLS (Floating) */}
            <div className="absolute top-6 left-6 right-6 flex justify-between items-start" style={{ pointerEvents: 'none' }}>
                <div className="flex gap-4 pointer-events-auto" style={{ pointerEvents: 'auto' }}>
                    {/* Toggle Sidebar Button if closed */}
                    {!isSidebarOpen && !isExamMode && (
                        <button onClick={() => setIsSidebarOpen(true)} className="p-3 bg-slate-900/80 backdrop-blur rounded-xl border border-white/10 text-white shadow-lg">
                            📦 KHO
                        </button>
                    )}

                    <div className="bg-slate-900/80 backdrop-blur-xl px-6 py-3 rounded-2xl border border-white/10 shadow-xl">
                        <h1 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 tracking-tight">
                            CHEMIC-AI
                        </h1>
                    </div>

                    <button
                        onClick={onTogglePerformance}
                        className={`px-4 py-3 rounded-xl border backdrop-blur-md transition-all text-[10px] font-bold uppercase tracking-wider
                            ${isPerformanceMode
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                                : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                            }`}
                    >
                        {isPerformanceMode ? '⚡ FAST' : '💎 AAA'}
                    </button>

                    <div className="bg-slate-900/80 backdrop-blur px-4 py-2 rounded-xl border border-orange-500/20 flex flex-col gap-1 w-40">
                        <div className="flex justify-between text-[9px] text-orange-400 font-bold uppercase">
                            <span>Bếp</span>
                            <span>{heaterTemp}°C</span>
                        </div>
                        <input
                            type="range" min="25" max="1000" step="25"
                            value={heaterTemp}
                            onChange={(e) => onSetHeaterTemp(Number(e.target.value))}
                            className="w-full h-1 accent-orange-500"
                        />
                    </div>
                </div>

                <div className="flex gap-3 pointer-events-auto" style={{ pointerEvents: 'auto' }}>
                    <button onClick={onReset} className="px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl font-bold text-xs">
                        RESET
                    </button>
                    <button onClick={() => setIsSettingsOpen(true)} className="p-3 bg-slate-900/80 border border-white/10 rounded-xl text-slate-400 hover:text-white">
                        ⚙️
                    </button>
                </div>
            </div>

            {/* QUEST LOG (CONDITIONAL) */}
            {isQuestLogOpen && (
                <div className="absolute top-24 left-6 bg-slate-900/90 backdrop-blur border border-amber-500/20 p-4 rounded-2xl w-64 shadow-2xl" style={{ pointerEvents: 'auto' }}>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-amber-500 font-bold text-xs uppercase">Nhiệm Vụ</span>
                        <button onClick={() => setIsQuestLogOpen(false)} className="text-slate-500 hover:text-white">✕</button>
                    </div>
                    <div className="space-y-2">
                        {quests.map(q => (
                            <div key={q.id} className={`text-[10px] p-2 rounded border ${q.isCompleted ? 'border-emerald-500/30 bg-emerald-900/10 text-emerald-400' : 'border-white/5 bg-white/5 text-slate-300'}`}>
                                {q.title}
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {!isQuestLogOpen && (
                <button
                    onClick={() => setIsQuestLogOpen(true)}
                    className="absolute top-24 left-6 bg-amber-500/10 text-amber-500 border border-amber-500/20 px-4 py-2 rounded-xl text-xs font-bold pointer-events-auto"
                    style={{ pointerEvents: 'auto' }}
                >
                    📋 NV ({quests.filter(q => !q.isCompleted).length})
                </button>
            )}

            {/* CHAT / GEMINI */}
            <div className="absolute bottom-6 right-6 flex flex-col items-end gap-4 pointer-events-auto" style={{ pointerEvents: 'auto' }}>
                {!isChatOpen && (
                    <button onClick={() => onToggleChat(true)} className="bg-slate-900/90 border border-indigo-500/30 p-4 rounded-2xl shadow-2xl flex items-center gap-3 group hover:scale-105 transition-transform">
                        <span className="text-2xl">🎓</span>
                        <div className="text-left">
                            <div className="text-indigo-400 font-bold text-xs">Hỏi Giáo Sư</div>
                            <div className="text-slate-500 text-[9px] uppercase">AI Assistant</div>
                        </div>
                    </button>
                )}

                {isChatOpen && (
                    <div className="w-[400px] h-[600px] bg-slate-950/95 backdrop-blur-xl border border-indigo-500/20 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
                        <div className="p-4 bg-white/5 border-b border-white/5 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <span className="text-xl">👩‍🔬</span>
                                <span className="font-bold text-sm text-white">Giáo Sư Lucy</span>
                            </div>
                            <button onClick={() => onToggleChat(false)} className="text-slate-500 hover:text-white">✕</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                            {chatHistory.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
                                        {formatScientificText(msg.text)}
                                    </div>
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>
                        <form onSubmit={handleSubmitChat} className="p-3 border-t border-white/5 bg-slate-900">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    placeholder="Hỏi gì đó..."
                                    className="w-full bg-slate-800 text-white text-xs px-4 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                                <button type="submit" disabled={isAiLoading} className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-400 hover:text-white">➤</button>
                            </div>
                        </form>
                    </div>
                )}
            </div>

            {/* SETTINGS MODAL (CONDITIONAL) */}
            {isSettingsOpen && (
                <div style={{ pointerEvents: 'auto' }}>
                    <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
                </div>
            )}

            {/* NOTEBOOK MODAL (CONDITIONAL) */}
            {isNotebookOpen && (
                <div style={{ pointerEvents: 'auto' }}>
                    <NotebookModal isOpen={isNotebookOpen} onClose={() => setIsNotebookOpen(false)} />
                </div>
            )}

            {/* REACTION ALERT */}
            {lastReaction && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none w-full flex justify-center z-30">
                    <div className="bg-slate-900/90 backdrop-blur-xl border border-orange-500/50 p-8 rounded-3xl shadow-2xl text-center max-w-md animate-in zoom-in duration-300">
                        <p className="text-orange-400 font-bold text-[10px] uppercase tracking-[0.3em] mb-4">REACTION DETECTED</p>
                        <p className="text-white text-lg font-medium">
                            {formatScientificText(lastReaction)}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LabUI;
