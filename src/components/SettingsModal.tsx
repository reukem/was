import React from 'react';
import { X } from 'lucide-react';

interface SettingsModalProps {
    isOpen?: boolean;
    onClose?: () => void;
    [key: string]: any; // Catch-all for any props passed by App.tsx
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen = false, onClose = () => {}, ...props }) => {
    // If it's conditionally rendered in App.tsx without isOpen, just render it.
    // If isOpen is explicitly false, hide it.
    if (isOpen === false && Object.keys(props).length > 0) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl w-96 shadow-2xl transform transition-all">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-cyan-400 font-mono tracking-wider">SYSTEM SETTINGS</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-red-400 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                        <p className="text-slate-300 text-sm font-mono">Neural Link Status: <span className="text-green-400">ONLINE</span></p>
                    </div>
                    <p className="text-slate-500 text-xs italic">Advanced configuration options are currently locked by the System Administrator.</p>
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded font-mono text-sm border border-slate-600 transition-colors"
                    >
                        CLOSE
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;