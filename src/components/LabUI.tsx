// src/components/LabUI.tsx
import React, { useState, useEffect, useRef } from 'react';
import SettingsModal from './SettingsModal';
import { ChatMessage, ContainerState, Chemical } from '../types';
import { CHEMICALS } from '../constants';
import { Quest } from '../systems/QuestManager';

// Helper to format scientific text (subscripts)
const formatScientificText = (text: string) => {
    if (!text) return '';
    const parts = text.split(/(\d+)/g);
    return parts.map((part, index) => {
        if (index % 2 === 1) { // Numbers
            return <sub key={index} className="text-[0.7em] align-baseline">{part}</sub>;
        }
        return part;
    });
};

const NotebookModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-slate-950/60 backdrop-blur-md pointer-events-auto">
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
                        {/* Placeholder for dynamic reaction logs if we had them */}
                        <div className="text-slate-400 text-sm italic">Chưa có dữ liệu phản ứng mới...</div>
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

    const avatarSrc = avatarState === 'shocked' ? '/lucy_shocked.png' : '/lucy_avatar.png';

    return (
        <div className="absolute bottom-6 right-6 z-50 pointer-events-auto flex flex-col items-end gap-3">
             <div className="w-80 bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                 <div className="p-4 border-b border-white/5 flex items-center gap-3">
                     <img src={avatarSrc} className="w-12 h-12 aspect-square object-cover rounded-md border border-cyan-500 shrink-0 shadow-[0_0_10px_rgba(6,182,212,0.3)] transition-all duration-300" alt="Prof Lucy" />
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
                                 ? 'bg-cyan-900/40 text-cyan-50 border border-cyan-700/50 rounded-tr-none'
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
                             className="w-full bg-slate-950 border border-slate-700/80 rounded-xl py-2.5 px-4 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                         />
                     </div>
                 </form>
             </div>
        </div>
    );
};

interface LabUIProps {
    lastReaction: string | null;
    containers: ContainerState[];
    chatHistory: ChatMessage[];
    isAiLoading: boolean;
    quests?: Quest[];
    safetyScore?: number;
    isChatOpen?: boolean;
    onToggleChat?: (v: boolean) => void;
    onSpawn: (chemId: string) => void;
    onReset: () => void;
    onStartExam?: () => void;
    isExamMode?: boolean;
    onUserChat?: (msg: string) => void;
    isPerformanceMode?: boolean;
    onTogglePerformance?: () => void;
    heaterTemp: number;
    onSetHeaterTemp: (v: number) => void;
    avatarState?: 'normal' | 'shocked';
}

const LabUI: React.FC<LabUIProps> = ({
    lastReaction, containers, chatHistory, isAiLoading, quests = [], safetyScore = 100,
    isChatOpen = true, onToggleChat, onSpawn, onReset, onStartExam, isExamMode,
    onUserChat, isPerformanceMode, onTogglePerformance, heaterTemp, onSetHeaterTemp,
    avatarState = 'normal'
}) => {
    const [chatInput, setChatInput] = useState("");
    const [isNotebookOpen, setIsNotebookOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (chatInput.trim() && onUserChat) {
            onUserChat(chatInput);
            setChatInput("");
        }
    };

    return (
        <div className="absolute inset-0 z-[999999] pointer-events-none overflow-hidden select-none font-sans">
            <div className="pointer-events-auto">
                <NotebookModal isOpen={isNotebookOpen} onClose={() => setIsNotebookOpen(false)} />
                <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
            </div>

            {/* Top-Left (Command Header) */}
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
                         <button
                            onClick={onTogglePerformance}
                            className={`border ${isPerformanceMode ? 'border-yellow-500/50 text-yellow-400' : 'border-blue-500/50 text-blue-400'} rounded-xl px-3 py-1 text-xs font-bold hover:bg-white/5 transition-colors`}
                         >
                             {isPerformanceMode ? '⚡ FAST' : '💎 AAA'}
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
                        onChange={(e) => onSetHeaterTemp(Number(e.target.value))}
                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                     />
                </div>
            </div>

            {/* MID-LEFT: QUESTS */}
            <div className="absolute top-1/2 left-6 transform -translate-y-1/2 w-64 pointer-events-auto">
                 {/* Safety Indicator */}
                 <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-emerald-500/30 p-3 flex items-center justify-between shadow-lg mb-4">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">TRẠNG THÁI</span>
                      <span className={`text-xs font-bold flex items-center gap-1 ${safetyScore < 50 ? 'text-red-500' : 'text-emerald-400'}`}>
                          {safetyScore < 50 ? 'NGUY HIỂM' : 'AN TOÀN'} <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${safetyScore < 50 ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                      </span>
                 </div>

                 {/* Quest Board */}
                 <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-700/50 shadow-2xl p-4">
                    <h2 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-3 border-b border-white/5 pb-2">
                        TIẾN ĐỘ ({quests.filter(q => q.isCompleted).length}/{quests.length})
                    </h2>
                    <div className="text-[10px] text-slate-400 space-y-2">
                        {quests.map(quest => (
                            <div key={quest.id} className={`flex items-center gap-2 ${quest.isCompleted ? 'text-emerald-400' : 'opacity-70'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${quest.isCompleted ? 'bg-emerald-500' : 'bg-slate-600'}`}></span>
                                <span className={quest.isCompleted ? 'line-through decoration-emerald-500/50' : ''}>{quest.title}</span>
                            </div>
                        ))}
                        {quests.length === 0 && <span className="opacity-50">Đang tải nhiệm vụ...</span>}
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
                            className="w-full text-left p-4 rounded-xl bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 hover:border-cyan-500/50 hover:bg-slate-800 transition-all group flex items-center justify-between shadow-lg"
                         >
                            <div>
                                <div className="text-xs font-bold text-slate-200 group-hover:text-cyan-400 transition-colors">Cốc Thí Nghiệm</div>
                                <div className="text-[10px] font-mono text-slate-500 mt-1">Dụng cụ chứa</div>
                            </div>
                            <span className="w-2 h-2 border border-slate-500 rounded-full group-hover:bg-slate-500 transition-colors"></span>
                         </button>

                         {Object.values(CHEMICALS).map(chem => (
                             <button
                                key={chem.id}
                                onClick={() => onSpawn(chem.id)}
                                className="w-full text-left p-4 rounded-xl bg-slate-900/80 backdrop-blur-sm border border-cyan-900/30 hover:border-cyan-500/50 hover:bg-slate-800 transition-all group flex items-center justify-between shadow-lg"
                             >
                                <div>
                                    <div className="text-xs font-bold text-slate-200 group-hover:text-cyan-400 transition-colors">{chem.name}</div>
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

            {/* Top-Right (Action Deck) */}
            <div className="absolute top-6 right-6 flex items-center gap-3 pointer-events-auto">
                 {onStartExam && (
                     <button
                        onClick={onStartExam}
                        disabled={isExamMode}
                        className={`bg-slate-900/80 backdrop-blur-md border border-orange-500/50 text-orange-400 text-xs font-bold px-5 py-2.5 rounded-full shadow-lg hover:bg-orange-500/10 transition-all hover:scale-105 active:scale-95 ${isExamMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                     >
                         {isExamMode ? 'ĐANG THI...' : 'BẮT ĐẦU THI'}
                     </button>
                 )}
                 <button onClick={() => setIsNotebookOpen(true)} className="w-10 h-10 bg-[#0f172a]/80 backdrop-blur-md rounded-full border border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-white hover:border-white/20 transition-all shadow-lg">
                     📖
                 </button>
                 <button onClick={onReset} className="w-10 h-10 bg-[#0f172a]/80 backdrop-blur-md rounded-full border border-slate-700/50 flex items-center justify-center text-red-400 hover:text-red-300 hover:border-red-500/30 transition-all shadow-lg">
                     ⟳
                 </button>
            </div>

            {/* Notification Alignment Matrix */}
            <div className="absolute top-12 left-1/2 transform -translate-x-1/2 z-50 flex flex-col items-center pointer-events-none">
                {lastReaction && (
                    <div className="bg-slate-900/90 backdrop-blur-xl border border-cyan-500/30 px-8 py-4 rounded-2xl shadow-[0_0_40px_rgba(6,182,212,0.3)] animate-in fade-in slide-in-from-top-4">
                         <p className="text-cyan-400 font-bold text-xs uppercase tracking-[0.2em] text-center mb-1">PHÁT HIỆN PHẢN ỨNG</p>
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
                isExpanded={isChatOpen}
                setIsExpanded={(v) => onToggleChat && onToggleChat(v)}
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

export default LabUI;
