import React, { useState, useRef, useEffect } from 'react';
import { CHEMICALS } from '../constants';
import { ContainerState } from '../types';

interface LabUIProps {
    lastReaction: string | null;
    containers: ContainerState[];
    aiFeedback: string;
    isAiLoading: boolean;
    onSpawn: (chemId: string) => void;
    onReset: () => void;
    onUserChat: (msg: string) => void;
}

const LabUI: React.FC<LabUIProps> = ({ lastReaction, containers, aiFeedback, isAiLoading, onSpawn, onReset, onUserChat }) => {
    const [chatInput, setChatInput] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);

    const handleSubmitChat = (e: React.FormEvent) => {
        e.preventDefault();
        if (chatInput.trim() && !isAiLoading) {
            onUserChat(chatInput);
            setChatInput('');
        }
    };

    // Auto-scroll chat (if we had history, but currently just one message, but good practice)
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [aiFeedback]);

    return (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 overflow-hidden select-none font-sans text-white">

            {/* --- HEADER --- */}
            <div className="flex justify-between items-start pointer-events-auto z-50">
                <div className="flex flex-col">
                    <div className="bg-lab-card/80 backdrop-blur-md px-8 py-6 rounded-2xl border border-lab-border shadow-xl">
                        <h1 className="text-4xl font-black text-blue-500 tracking-tight">
                            CHEMIC-AI
                        </h1>
                        <div className="flex items-center gap-2 mt-1 opacity-70">
                            <span className="text-[10px] font-mono tracking-[0.2em] text-lab-text uppercase">
                                Research Environment // V4.0
                            </span>
                        </div>
                    </div>
                    {/* Database Header connected visually or separate? Reference shows separate sidebar header */}
                </div>

                <button
                    onClick={onReset}
                    className="group flex items-center gap-2 px-6 py-3 rounded-lg border border-red-500/30 bg-red-900/10 hover:bg-red-500/10 transition-all cursor-pointer backdrop-blur-sm"
                >
                    <span className="text-[11px] font-black tracking-widest text-red-400 group-hover:text-red-300 uppercase">
                        Sterilize Workspace
                    </span>
                </button>
            </div>

            {/* --- SIDEBAR (Compound Database) --- */}
            <div className="absolute left-6 top-40 bottom-20 w-64 flex flex-col pointer-events-auto z-40">
                <div className="mb-4">
                    <h2 className="text-[11px] font-black tracking-widest text-indigo-400 uppercase bg-lab-card/50 w-fit px-3 py-1 rounded-full border border-indigo-500/20 backdrop-blur-md">
                        Compound Database
                    </h2>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-3 pb-4 custom-scrollbar">
                    {/* Helper to spawn empty beaker */}
                    <div
                        onClick={() => onSpawn('BEAKER')}
                        className="group relative bg-lab-card/80 hover:bg-lab-border border border-lab-border hover:border-white/20 p-4 rounded-xl cursor-pointer transition-all shadow-lg backdrop-blur-sm"
                    >
                        <div className="flex justify-between items-start mb-1">
                            <span className="text-sm font-bold text-slate-200">Sterile Beaker</span>
                            <div className="w-2 h-2 rounded-full bg-slate-500 shadow-[0_0_8px_rgba(148,163,184,0.5)]"></div>
                        </div>
                        <div className="text-[10px] font-mono text-lab-text uppercase tracking-wider">Borosilicate Glassware</div>
                    </div>

                    {/* Chemicals */}
                    {Object.values(CHEMICALS).map(chem => (
                        <div
                            key={chem.id}
                            onClick={() => onSpawn(chem.id)}
                            className="group relative bg-lab-card/80 hover:bg-lab-border border border-lab-border hover:border-lab-cyan/30 p-4 rounded-xl cursor-pointer transition-all shadow-lg backdrop-blur-sm"
                        >
                             {/* Hover Glow */}
                             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl pointer-events-none" />

                            <div className="flex justify-between items-start mb-2">
                                <span className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">{chem.name}</span>
                                <div
                                    className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]"
                                    style={{ color: chem.color, backgroundColor: chem.color }}
                                ></div>
                            </div>
                            <div className="text-[10px] font-mono text-lab-text group-hover:text-lab-cyan transition-colors">{chem.formula}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* --- REACTION ALERT (Floating Centered) --- */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none w-full flex justify-center z-30">
                {lastReaction && (
                    <div className="animate-in fade-in zoom-in duration-300 slide-in-from-bottom-4 bg-lab-card/90 backdrop-blur-xl border border-orange-500/30 px-8 py-6 rounded-2xl shadow-[0_0_50px_rgba(249,115,22,0.1)] text-center max-w-md">
                        <div className="flex justify-center mb-2">
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-orange-500 border border-orange-500/30 px-2 py-0.5 rounded-full">Reaction Detected</span>
                        </div>
                        <p className="text-white text-lg font-medium leading-relaxed font-mono">{lastReaction}</p>
                    </div>
                )}
            </div>

            {/* --- FOOTER / STATUS BAR --- */}
            <div className="absolute bottom-8 left-0 right-0 flex justify-center pointer-events-none z-30">
                <div className="bg-lab-card/80 backdrop-blur-md px-8 py-2 rounded-full border border-lab-border shadow-2xl flex items-center gap-8 pointer-events-auto">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-[10px] font-mono text-slate-400 tracking-widest">SYSTEM_READY</span>
                    </div>
                    <div className="w-px h-3 bg-white/10"></div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-400 tracking-widest">ENTITIES: <span className="text-white">{containers.length}</span></span>
                    </div>
                    <div className="w-px h-3 bg-white/10"></div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-indigo-400 tracking-widest">GEMINI_ULTRA_MODE</span>
                    </div>
                </div>
            </div>

            {/* --- CHAT INTERFACE (Professor Gemini) --- */}
            <div className="absolute right-8 bottom-8 w-[24rem] pointer-events-auto z-50">
                <div className="bg-lab-card/95 backdrop-blur-xl border border-lab-border rounded-3xl shadow-2xl overflow-hidden">
                    {/* Chat Header */}
                    <div className="p-5 flex items-center gap-4 border-b border-white/5">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-900 to-slate-900 flex items-center justify-center border border-indigo-500/30 shadow-inner">
                            {/* Graduation Cap Icon SVG */}
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-sm tracking-tight">Professor Gemini</h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <div className={`w-1.5 h-1.5 rounded-full ${isAiLoading ? 'bg-amber-400 animate-bounce' : 'bg-emerald-500'}`}></div>
                                <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">
                                    {isAiLoading ? 'ANALYZING...' : 'ACTIVE'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Chat Content */}
                    <div className="p-5 min-h-[120px] max-h-[200px] overflow-y-auto">
                        <p className="text-slate-300 text-sm leading-relaxed font-light">
                            "{aiFeedback}"
                        </p>
                        <div ref={chatEndRef} />
                    </div>

                    {/* Chat Input */}
                    <div className="p-4 pt-0">
                        <form onSubmit={handleSubmitChat} className="relative group">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                placeholder="Inquire about chemical principles..."
                                className="w-full bg-slate-950/50 text-slate-200 text-xs px-4 py-3.5 rounded-xl border border-white/10 focus:border-indigo-500/50 focus:outline-none transition-all placeholder-slate-600"
                            />
                            <button
                                type="submit"
                                disabled={isAiLoading || !chatInput.trim()}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 transition-colors disabled:opacity-50"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                </svg>
                            </button>
                        </form>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default LabUI;
