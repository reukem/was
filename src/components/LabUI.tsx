import React, { useState, useRef, useEffect } from 'react';
import { CHEMICALS, REACTION_REGISTRY } from '../constants';
import { ContainerState, ChatMessage } from '../types';
import { audioManager } from '../utils/AudioManager';
import { Quest } from '../systems/QuestManager';

interface LabUIProps {
    lastReaction: string | null;
    containers: ContainerState[];
    chatHistory: ChatMessage[];
    aiFeedback?: string; // Legacy prop, kept for compatibility if needed
    isAiLoading: boolean;
    quests: Quest[];
    onSpawn: (chemId: string) => void;
    onReset: () => void;
    onUserChat: (msg: string) => void;
}

const formatScientificText = (text: string) => {
    if (!text) return null;
    // Replace typical chemical numbers with subscripts
    const parts = text.split(/(\d+)/g);
    return parts.map((part, index) => {
        // Simple heuristic: if it's a number and previous part ends with a letter, subscript it
        // This is basic, a regex might be better for specific chemical patterns,
        // but for now we follow the user's intent.
        // Actually, the user asked for Unicode subscripts or HTML tags.
        if (index % 2 === 1) {
            return <sub key={index} className="text-[0.7em] align-baseline">{part}</sub>;
        }
        return part;
    });
};

const NotebookModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm pointer-events-auto">
            <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl w-[600px] max-h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="p-4 border-b border-indigo-500/20 flex justify-between items-center bg-indigo-900/20">
                    <h2 className="text-xl font-black text-indigo-300 tracking-wider flex items-center gap-2">
                        <span>📖</span> LABORATORY NOTES
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors text-2xl leading-none">&times;</button>
                </div>
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    <p className="text-sm text-slate-400 mb-4 font-mono uppercase tracking-widest border-b border-white/5 pb-2">
                        AUTHORIZED PERSONNEL ONLY. RECORDED REACTION PROTOCOLS.
                    </p>
                    <div className="space-y-4">
                        {REACTION_REGISTRY.map((reaction, idx) => (
                            <div key={idx} className="bg-slate-800/50 p-4 rounded-lg border border-white/5 hover:border-indigo-500/30 transition-colors">
                                <div className="flex items-center flex-wrap gap-2 mb-2">
                                    <span className="text-xs font-bold text-slate-300 bg-slate-700 px-2 py-1 rounded">
                                        {formatScientificText(reaction.reactants[0])}
                                    </span>
                                    <span className="text-slate-500">+</span>
                                    <span className="text-xs font-bold text-slate-300 bg-slate-700 px-2 py-1 rounded">
                                        {formatScientificText(reaction.reactants[1])}
                                    </span>
                                    <span className="text-slate-500">→</span>
                                    <span className="text-xs font-bold text-emerald-400">
                                        {formatScientificText(reaction.product)}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400 italic border-l-2 border-slate-600 pl-2">
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

const LabUI: React.FC<LabUIProps> = ({ lastReaction, containers, chatHistory, isAiLoading, quests, onSpawn, onReset, onUserChat }) => {
    const [chatInput, setChatInput] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isNotebookOpen, setIsNotebookOpen] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false); // Collapsed by default
    const [isQuestLogOpen, setIsQuestLogOpen] = useState(true);
    const [isMuted, setIsMuted] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const handleSubmitChat = (e: React.FormEvent) => {
        e.preventDefault();
        if (chatInput.trim() && !isAiLoading) {
            onUserChat(chatInput);
            setChatInput('');
        }
    };

    // Auto-scroll chat
    useEffect(() => {
        if (isChatOpen) {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatHistory, isChatOpen]);

    // Voice Synthesis
    useEffect(() => {
        const lastMsg = chatHistory[chatHistory.length - 1];
        if (!isMuted && lastMsg?.role === 'model' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            // Strip markdown/html for speech
            const cleanText = lastMsg.text.replace(/[*_`]/g, '');
            const utterance = new SpeechSynthesisUtterance(cleanText);
            utterance.rate = 1.0;
            utterance.pitch = 0.9;
            window.speechSynthesis.speak(utterance);
        }
    }, [chatHistory, isMuted]);

    return (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 overflow-hidden select-none font-sans text-white">
            <NotebookModal isOpen={isNotebookOpen} onClose={() => setIsNotebookOpen(false)} />

            {/* --- HEADER --- */}
            <div className="flex justify-between items-start pointer-events-auto z-50">
                <div className="flex flex-col gap-2">
                    <div className="bg-slate-900/90 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 shadow-xl">
                        <h1 className="text-3xl font-black bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent tracking-tighter">
                            CHEMIC-AI
                        </h1>
                        <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-[0.3em] font-medium">
                            Research Environment // v4.2.1
                        </p>
                    </div>

                    {/* QUEST LOG */}
                    <div className={`transition-all duration-300 ${isQuestLogOpen ? 'w-64 opacity-100' : 'w-0 opacity-0 overflow-hidden'}`}>
                        <div className="bg-slate-900/80 backdrop-blur-md border border-amber-500/20 rounded-xl p-3 shadow-lg">
                            <div className="flex justify-between items-center mb-2 border-b border-white/10 pb-1">
                                <span className="text-amber-400 font-bold text-[10px] uppercase tracking-widest">Current Tasks</span>
                                <button onClick={() => setIsQuestLogOpen(false)} className="text-slate-500 hover:text-white">✕</button>
                            </div>
                            <div className="space-y-2">
                                {quests.map(q => (
                                    <div key={q.id} className={`text-xs p-2 rounded border ${q.isCompleted ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-300 line-through opacity-50' : 'bg-slate-800/50 border-white/5 text-slate-300'}`}>
                                        <p className="font-bold mb-0.5">{q.title}</p>
                                        <p className="text-[9px] text-slate-400">{q.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    {!isQuestLogOpen && (
                        <button
                            onClick={() => setIsQuestLogOpen(true)}
                            className="bg-amber-500/10 text-amber-400 border border-amber-500/30 p-2 rounded-lg text-xs font-bold uppercase tracking-wider backdrop-blur-md hover:bg-amber-500/20 transition-all text-left w-fit"
                        >
                            📋 Tasks ({quests.filter(q => !q.isCompleted).length})
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsNotebookOpen(true)}
                        className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 px-4 py-3 rounded-xl border border-indigo-500/20 transition-all font-bold text-xl backdrop-blur-md shadow-lg"
                        title="Open Lab Notebook"
                    >
                        📖
                    </button>
                    <button
                        onClick={onReset}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 px-5 py-3 rounded-xl border border-red-500/20 transition-all font-bold text-[10px] uppercase tracking-widest backdrop-blur-md shadow-lg"
                    >
                        Sterilize
                    </button>
                </div>
            </div>

            {/* --- SIDEBAR (Compound Database) --- */}
            <div className={`absolute left-6 top-36 bottom-24 w-64 pointer-events-auto transition-transform duration-300 ease-in-out z-40 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-[120%]'}`}>
                <div className="flex justify-between items-center mb-2 px-2">
                    <h2 className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] drop-shadow-md">Chemical Inventory</h2>
                    <button onClick={() => setIsSidebarOpen(false)} className="text-slate-500 hover:text-white transition-colors">✕</button>
                </div>

                <div className="h-full overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-2 pb-4">
                    {/* Helper to spawn empty beaker */}
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => onSpawn('BEAKER')}
                            onMouseEnter={() => audioManager.playUIHover()}
                            className="group p-3 rounded-xl bg-slate-950/40 hover:bg-indigo-500/20 border border-white/5 hover:border-indigo-500/40 transition-all text-left backdrop-blur-md shadow-sm"
                        >
                            <span className="text-xs font-bold text-slate-200">Beaker</span>
                            <p className="text-[8px] text-slate-500 mt-1 uppercase tracking-wider">250ml Glass</p>
                        </button>
                        <button
                            onClick={() => onSpawn('TEST_TUBE')}
                            onMouseEnter={() => audioManager.playUIHover()}
                            className="group p-3 rounded-xl bg-slate-950/40 hover:bg-indigo-500/20 border border-white/5 hover:border-indigo-500/40 transition-all text-left backdrop-blur-md shadow-sm"
                        >
                            <span className="text-xs font-bold text-slate-200">Test Tube</span>
                            <p className="text-[8px] text-slate-500 mt-1 uppercase tracking-wider">Sample Glass</p>
                        </button>
                    </div>

                    <div className="h-px bg-white/10 my-1 mx-2" />

                    {/* Chemicals */}
                    {Object.values(CHEMICALS).map(chem => (
                        <button
                            key={chem.id}
                            onClick={() => onSpawn(chem.id)}
                            onMouseEnter={() => audioManager.playUIHover()}
                            className="group relative p-3 rounded-lg bg-slate-950/30 hover:bg-slate-800/60 border border-white/5 hover:border-indigo-500/40 transition-all text-left backdrop-blur-sm shadow-sm"
                        >
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[11px] font-bold text-slate-300 group-hover:text-white transition-colors">{chem.name}</span>
                                <div
                                    className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.1)]"
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

            {!isSidebarOpen && (
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="absolute left-6 top-36 pointer-events-auto bg-slate-900/80 p-3 rounded-xl border border-white/10 text-indigo-400 hover:text-white transition-all shadow-lg z-40"
                >
                    <span className="writing-vertical text-xs font-bold uppercase tracking-widest">Inventory</span>
                </button>
            )}

            {/* --- REACTION ALERT (Floating Centered) --- */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none w-full flex justify-center z-30">
                {lastReaction && (
                    <div className="animate-in fade-in zoom-in duration-500 slide-in-from-bottom-8 bg-slate-900/90 backdrop-blur-3xl border border-orange-500/30 p-8 rounded-[2rem] shadow-2xl text-center max-w-lg">
                        <p className="text-orange-400 font-bold text-[10px] uppercase tracking-[0.2em] mb-3">Reaction Detected</p>
                        <p className="text-white text-md font-medium leading-relaxed tracking-tight shadow-sm">
                            {formatScientificText(lastReaction)}
                        </p>
                    </div>
                )}
            </div>

            {/* --- FOOTER / STATUS BAR --- */}
            <div className="absolute bottom-6 left-0 w-full flex justify-center pointer-events-none z-30">
                <div className="flex justify-center text-slate-500 text-[8px] font-mono gap-12 bg-slate-900/60 backdrop-blur-md py-3 px-10 rounded-full border border-white/5 pointer-events-auto shadow-inner">
                    <span className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-emerald-500"/> SYSTEM_READY</span>
                    <span>ENTITIES: {containers.length}</span>
                    <span className="text-slate-400">GEMINI_ADVANCED_CORE</span>
                </div>
            </div>

            {/* --- CHAT INTERFACE (Professor Gemini) --- */}
            <div className="absolute right-8 bottom-8 pointer-events-auto z-50 flex flex-col items-end gap-4">

                {/* Minimized Button "Comm Link" */}
                {!isChatOpen && (
                    <button
                        onClick={() => setIsChatOpen(true)}
                        className="bg-slate-900/90 backdrop-blur-xl border border-indigo-500/30 p-4 rounded-2xl shadow-2xl hover:bg-indigo-900/20 transition-all group flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4"
                    >
                        <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-xl shadow-xl border border-white/5 group-hover:scale-110 transition-transform">
                            🎓
                        </div>
                        <div className="text-left">
                            <div className="text-xs font-bold text-indigo-300">Comm Link</div>
                            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Professor Lucy</div>
                        </div>
                    </button>
                )}

                {/* Expanded Chat Window */}
                {isChatOpen && (
                    <div className="w-[24rem] h-[32rem] bg-slate-900/95 backdrop-blur-3xl border border-indigo-500/30 rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-300">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-slate-800/30 cursor-pointer" onClick={() => setIsChatOpen(false)}>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-lg shadow-inner border border-white/5">
                                    👩‍🔬
                                </div>
                                <div>
                                    <h3 className="text-white font-bold text-xs tracking-tight">Professor Lucy</h3>
                                    <div className="flex items-center gap-1.5">
                                        <div className={`w-1.5 h-1.5 rounded-full ${isAiLoading ? 'bg-amber-400 animate-bounce' : 'bg-emerald-500'}`}></div>
                                        <span className="text-[8px] text-slate-400 font-mono uppercase tracking-widest">
                                            {isAiLoading ? 'THINKING...' : 'ONLINE :3'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                                className="text-slate-400 hover:text-white p-2 transition-colors mr-1"
                                title={isMuted ? "Unmute Voice" : "Mute Voice"}
                            >
                                {isMuted ? "🔇" : "🔊"}
                            </button>
                            <button onClick={() => setIsChatOpen(false)} className="text-slate-400 hover:text-white p-2">✕</button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar bg-black/20">
                            {chatHistory.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-200 rounded-bl-none border border-white/5'}`}>
                                        {formatScientificText(msg.text)}
                                    </div>
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Input */}
                        <form onSubmit={handleSubmitChat} className="p-3 bg-slate-800/50 border-t border-white/5">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    placeholder="Ask the Professor..."
                                    className="w-full bg-slate-950/50 text-slate-200 text-xs px-4 py-3 rounded-xl border border-white/10 focus:border-indigo-500/50 focus:outline-none transition-all placeholder-slate-600 pr-10"
                                />
                                <button
                                    type="submit"
                                    disabled={isAiLoading || !chatInput.trim()}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
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
