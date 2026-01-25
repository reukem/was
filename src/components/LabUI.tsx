import React from 'react';
import { CHEMICALS } from '../constants';
import { ContainerState } from '../types';

interface LabUIProps {
    lastReaction: string | null;
    containers: ContainerState[];
    aiFeedback: string;
    isAiLoading: boolean;
    onSpawn: (chemId: string) => void;
    onReset: () => void;
}

const LabUI: React.FC<LabUIProps> = ({ lastReaction, containers, aiFeedback, isAiLoading, onSpawn, onReset }) => {
    return (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 overflow-hidden select-none font-sans">
            {/* Header */}
            <div className="flex justify-between items-start pointer-events-auto">
                <div className="bg-slate-900/90 backdrop-blur-xl p-5 rounded-2xl border border-white/10 shadow-2xl">
                    <h1 className="text-3xl font-black bg-gradient-to-br from-emerald-300 via-cyan-400 to-blue-500 bg-clip-text text-transparent tracking-tighter">
                        ALCHEMIST AI
                    </h1>
                    <p className="text-slate-500 text-[9px] mt-1 uppercase tracking-[0.3em] font-black">Simulation Engine // 5.0 Stable</p>
                </div>
                <div className="flex flex-col gap-2 items-end">
                    <button
                        onClick={onReset}
                        className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white px-5 py-2 rounded-xl border border-red-500/20 transition-all font-bold text-xs uppercase tracking-widest backdrop-blur-md shadow-lg"
                    >
                        Sterilize Workspace
                    </button>
                </div>
            </div>

            {/* Inventory Sidebar (Substances Chart) */}
            <div className="absolute left-6 top-32 pointer-events-auto h-[65vh] overflow-y-auto pr-4 scroll-smooth">
                <div className="flex flex-col gap-2 w-48">
                    <div className="bg-slate-800/80 p-3 rounded-xl border border-white/10 mb-2">
                        <h2 className="text-cyan-400 font-black text-[10px] uppercase tracking-[0.2em]">Substances Chart</h2>
                    </div>

                    <button
                        onClick={() => onSpawn('BEAKER')}
                        className="group p-4 rounded-2xl bg-white/5 hover:bg-emerald-500/10 border border-white/5 hover:border-emerald-500/30 transition-all text-left shadow-lg backdrop-blur-sm"
                    >
                        <span className="text-xs font-bold text-slate-300">Clean Beaker</span>
                        <p className="text-[9px] text-slate-500 mt-1 uppercase tracking-wider">Empty Pyrex Container</p>
                    </button>

                    <div className="h-px bg-white/5 my-2" />

                    {Object.values(CHEMICALS).map(chem => (
                        <button
                            key={chem.id}
                            onClick={() => onSpawn(chem.id)}
                            className="group relative p-3 rounded-xl bg-slate-800/40 hover:bg-slate-700/60 border border-white/5 hover:border-cyan-500/50 transition-all text-left shadow-md backdrop-blur-sm"
                        >
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[11px] font-bold text-slate-100">{chem.name}</span>
                                <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.2)]" style={{ backgroundColor: chem.color }}></div>
                            </div>
                            <span className="text-[9px] font-mono text-slate-400 group-hover:text-cyan-400 tracking-tighter">{chem.formula}</span>
                            <div className="absolute inset-0 rounded-xl bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Central Reaction Notification */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none w-full flex justify-center">
                {lastReaction && (
                    <div className="animate-in fade-in zoom-in duration-500 slide-in-from-bottom-8 bg-slate-900/90 backdrop-blur-3xl border-2 border-orange-500/50 p-8 rounded-[2.5rem] shadow-[0_0_150px_rgba(249,115,22,0.2)] text-center max-w-lg">
                        <p className="text-orange-400 font-black text-[10px] uppercase tracking-[0.4em] mb-3">Thermodynamic Alert</p>
                        <p className="text-white text-xl font-bold leading-relaxed tracking-tight shadow-sm">{lastReaction}</p>
                    </div>
                )}
            </div>

            {/* Professor AI Module */}
            <div className="flex justify-end pointer-events-auto">
                <div className="relative group max-w-sm animate-float">
                    <div className="bg-slate-900/95 backdrop-blur-3xl border border-indigo-500/30 p-6 rounded-[2rem] shadow-2xl relative">
                        <div className="flex items-center gap-4 mb-4 border-b border-white/5 pb-4">
                            <div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center text-2xl shadow-xl">
                                👨‍🔬
                            </div>
                            <div>
                                <h3 className="text-indigo-200 font-black text-sm tracking-tight">Professor Alchemist</h3>
                                {isAiLoading ? (
                                    <div className="flex gap-1 mt-1">
                                        <div className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce" />
                                        <div className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                                        <div className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-[8px] text-emerald-400 font-black uppercase tracking-widest">System Active</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <p className="text-slate-300 text-sm italic font-medium leading-relaxed">
                            "{aiFeedback}"
                        </p>
                    </div>
                    {/* Decorative aura */}
                    <div className="absolute -inset-1 bg-indigo-500/5 rounded-[2.1rem] blur-2xl -z-10" />
                </div>
            </div>

            {/* Diagnostics Bar */}
            <div className="flex justify-center text-slate-500 text-[8px] font-mono gap-12 mt-6 bg-slate-900/60 backdrop-blur-md py-3 px-10 rounded-full border border-white/5 pointer-events-auto shadow-inner">
                <span className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-emerald-500"/> PHYSICS_STABLE</span>
                <span>MOLECULAR_CACHE: {containers.length}</span>
                <span className="text-slate-400">GEMINI_3_FLASH_ENABLED</span>
            </div>
        </div>
    );
};

export default LabUI;
