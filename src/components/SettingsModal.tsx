import React from 'react';
import { X, Bot, Sparkles } from 'lucide-react';

interface SettingsModalProps {
    isOpen?: boolean;
    onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen = true, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-md">
            <div className="bg-slate-800/95 border border-cyan-500/30 p-6 rounded-2xl w-[28rem] shadow-[0_0_40px_-10px_rgba(6,182,212,0.3)] transform transition-all">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-cyan-400 font-mono tracking-wider flex items-center gap-2">
                        <Sparkles className="text-cyan-400" size={20} />
                        SYSTEM SETTINGS
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-slate-800">
                        <X size={24} />
                    </button>
                </div>

                {/* AI Profile Section */}
                <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 mb-6">
                    <div className="relative w-16 h-16 rounded-full border-2 border-cyan-400 p-1 flex items-center justify-center overflow-hidden bg-slate-800">
                        <img
                            src="/lucy.png"
                            alt="Lucy"
                            className="w-full h-full object-cover rounded-full"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                            }}
                        />
                        <Bot className="hidden text-cyan-400 absolute" size={32} />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-lg font-mono">PROFESSOR LUCY</h3>
                        <p className="text-cyan-400 text-xs font-mono">Neural Link: ONLINE</p>
                    </div>
                </div>

                {/* Settings Content */}
                <div className="space-y-4">
                    <p className="text-slate-400 text-sm">Advanced configuration options are currently locked by the System Administrator.</p>
                </div>

                {/* Footer */}
                <div className="mt-8 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-cyan-950/30 hover:bg-cyan-900/50 text-cyan-400 rounded-lg font-mono text-sm border border-cyan-800 transition-colors"
                    >
                        CLOSE LINK
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;