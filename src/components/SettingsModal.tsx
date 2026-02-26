import React, { useState, useEffect } from 'react';

const SettingsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const [apiKey, setApiKey] = useState("");

    useEffect(() => {
        const storedKey = localStorage.getItem('gemini_api_key');
        if (storedKey) setApiKey(storedKey);
    }, [isOpen]);

    const handleSave = () => {
        localStorage.setItem('gemini_api_key', apiKey);
        window.location.reload();
    };

    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-md pointer-events-auto">
            <div className="bg-slate-900 border border-white/10 rounded-3xl w-[400px] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in duration-200">

                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <h2 className="text-xl font-black text-slate-200 tracking-widest flex items-center gap-2">
                        <span>⚙️</span> SYSTEM CONFIG
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors text-2xl leading-none">&times;</button>
                </div>

                <div className="p-8 space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">
                            Gemini API Key
                        </label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="AIzaSy..."
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-cyan-500 shadow-inner transition-colors"
                        />
                        <p className="text-[10px] text-slate-500 mt-2 font-mono">
                            Required for Professor Lucy's Neural Uplink.
                        </p>
                    </div>
                </div>

                <div className="p-6 bg-slate-950/50 flex justify-end gap-3 border-t border-white/5">
                    <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors">
                        CANCEL
                    </button>
                    <button onClick={handleSave} className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold px-6 py-2 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all">
                        SAVE & REBOOT
                    </button>
                </div>

            </div>
        </div>
    );
};

export default SettingsModal;
