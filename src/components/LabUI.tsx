import React, { useState } from 'react';
import { ContainerState } from '../types/ChemistryTypes';
import { CHEMICALS } from '../systems/ChemicalDatabase';

interface LabUIProps {
    apiKey: string;
    setApiKey: (key: string) => void;
    lastReaction: string | null;
    containers: ContainerState[];
    aiFeedback: string;
    isAiLoading: boolean;
    onSpawn: (chemId: string) => void;
    onReset: () => void;
}

const LabUI: React.FC<LabUIProps> = ({ apiKey, setApiKey, lastReaction, containers, aiFeedback, isAiLoading, onSpawn, onReset }) => {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    return (
        <div className="lab-ui flex flex-col justify-between h-full pointer-events-none">
            {/* Header */}
            <div className="flex justify-between items-start pointer-events-auto p-4 z-20">
                <h1 className="ui-title text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-600 drop-shadow-sm">
                    Chemistry Lab AI
                </h1>
                <div className="flex gap-2">
                     <button
                        onClick={onReset}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded shadow text-sm transition-colors"
                     >
                        Reset Lab
                     </button>
                    <div className="bg-slate-800/90 p-2 rounded border border-slate-600 flex items-center gap-2">
                        <span className="text-xs text-slate-400">API Key:</span>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Gemini Key..."
                            className="bg-transparent text-white border-b border-slate-500 focus:outline-none text-sm w-32"
                        />
                    </div>
                </div>
            </div>

            {/* Sidebar Inventory */}
            <div className={`absolute left-0 top-20 bottom-20 transition-all duration-300 pointer-events-auto flex ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="bg-slate-900/90 border-r border-slate-700 w-64 p-4 overflow-y-auto backdrop-blur-sm">
                     <h2 className="text-slate-300 font-bold mb-4 uppercase text-sm tracking-wider">Inventory</h2>
                     <div className="space-y-2">
                        {Object.values(CHEMICALS).map(chem => (
                            <button
                                key={chem.id}
                                onClick={() => onSpawn(chem.id)}
                                className="w-full text-left p-3 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-blue-500 transition-all group"
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-semibold text-slate-200">{chem.name}</span>
                                    <div className="w-3 h-3 rounded-full border border-slate-500" style={{ backgroundColor: chem.color }}></div>
                                </div>
                                <div className="text-xs text-slate-500 group-hover:text-slate-400">{chem.formula}</div>
                            </button>
                        ))}
                     </div>
                </div>
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="h-12 w-6 bg-slate-800 border-y border-r border-slate-600 rounded-r flex items-center justify-center text-slate-400 hover:text-white self-center -ml-1 z-[-1]"
                >
                    {sidebarOpen ? '‹' : '›'}
                </button>
            </div>

            {/* Reaction Alert */}
            {lastReaction && (
                <div className="absolute top-24 left-1/2 transform -translate-x-1/2 bg-slate-800/90 p-4 rounded-lg border border-yellow-500 text-white shadow-lg transition-all animate-bounce-short z-10">
                    <span className="text-yellow-400 font-bold">REACTION:</span> {lastReaction}
                </div>
            )}

            {/* AI Teacher Bubble */}
            <div className="absolute bottom-8 right-8 w-96 pointer-events-auto z-20">
                <div className="bg-slate-900/95 border border-indigo-500 rounded-lg p-5 shadow-2xl relative">
                    <div className="absolute -top-3 -left-3 bg-indigo-600 rounded-full p-2 shadow-lg border-2 border-slate-900">
                        <div className="text-2xl">🧙‍♂️</div>
                    </div>
                    <div className="ml-8 mb-2 flex justify-between items-center">
                        <div className="font-bold text-indigo-300">Prof. Alchemist</div>
                        {isAiLoading && <div className="text-xs text-indigo-400 animate-pulse">Thinking...</div>}
                    </div>
                    <p className="text-slate-200 text-sm leading-relaxed border-l-2 border-indigo-500/30 pl-3">
                        {aiFeedback}
                    </p>
                </div>
            </div>

            {/* Footer Info */}
            <div className="pointer-events-auto absolute bottom-2 left-4 text-slate-500 text-xs">
                Active Containers: {containers.length} &bull; Drag & Drop to Pour &bull; v1.0.0 Premium
            </div>
        </div>
    );
};

export default LabUI;
