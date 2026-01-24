import React, { useState } from 'react';
import { ContainerState } from '../types/ChemistryTypes';
import { CHEMICALS } from '../systems/ChemicalDatabase';
import TeacherInterface from './TeacherInterface';
import { AIService } from '../systems/AIService';

interface LabUIProps {
    apiKey: string;
    setApiKey: (key: string) => void;
    lastReaction: string | null;
    containers: ContainerState[];
    onSpawn: (chemId: string) => void;
    onReset: () => void;
    aiService: AIService;
}

const LabUI: React.FC<LabUIProps> = ({ apiKey, setApiKey, lastReaction, containers, onSpawn, onReset, aiService }) => {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    return (
        <div className="lab-ui flex flex-col justify-between h-full pointer-events-none">
            {/* Header */}
            <div className="flex justify-between items-start pointer-events-auto p-4 z-20">
                <h1 className="ui-title text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500 drop-shadow-sm filter">
                    Kid's Chemistry Lab
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
                     <h2 className="text-slate-300 font-bold mb-4 uppercase text-sm tracking-wider">Extra Supplies</h2>
                     <div className="space-y-2">
                        <button
                            onClick={() => onSpawn('BEAKER')}
                            className="w-full text-left p-3 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-blue-500 transition-all group mb-2"
                        >
                             <div className="flex items-center justify-between mb-1">
                                    <span className="font-semibold text-slate-200">Empty Beaker</span>
                                    <div className="w-3 h-3 rounded-full border border-slate-500 bg-transparent"></div>
                                </div>
                                <div className="text-xs text-slate-500 group-hover:text-slate-400">Glass Container</div>
                        </button>

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
                <div className="absolute top-24 left-1/2 transform -translate-x-1/2 bg-slate-800/90 p-4 rounded-lg border border-yellow-500 text-white shadow-lg transition-all animate-bounce-short z-10 pointer-events-auto">
                    <span className="text-yellow-400 font-bold">REACTION:</span> {lastReaction}
                </div>
            )}

            {/* AI Teacher Interface */}
            <div className="pointer-events-auto">
                <TeacherInterface
                    lastReactionMessage={lastReaction}
                    aiService={aiService}
                />
            </div>

            {/* Footer Info */}
            <div className="pointer-events-auto absolute bottom-2 left-4 text-slate-500 text-xs">
                Active Containers: {containers.length} &bull; Drag & Drop to Pour &bull; v1.0.0 Premium
            </div>
        </div>
    );
};

export default LabUI;
