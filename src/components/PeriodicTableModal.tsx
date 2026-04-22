import React from 'react';
import { Chemical, CHEMICALS } from '../App';

interface PeriodicTableModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSpawn: (chemId: string) => void;
    lang: 'EN' | 'VN';
}

const PeriodicTableModal: React.FC<PeriodicTableModalProps> = ({ isOpen, onClose, onSpawn, lang }) => {
    if (!isOpen) return null;

    const allChemicals = Object.values(CHEMICALS);
    const basicChemicals = allChemicals.filter(c => c.category === 'basic').sort((a, b) => (a.atomicNumber || 999) - (b.atomicNumber || 999));
    const advancedChemicals = allChemicals.filter(c => c.category === 'advanced');

    const getBgColor = (chem: Chemical) => {
        if (chem.category === 'advanced') {
             if (chem.type === 'liquid') return 'bg-cyan-500/20 hover:bg-cyan-500/40 border-cyan-500/50';
             return 'bg-slate-500/20 hover:bg-slate-500/40 border-slate-500/50';
        }

        // Basic grouping logic for colors
        if (['H2', 'O2', 'N2', 'CHLORINE', 'C', 'IODINE'].includes(chem.id)) return 'bg-blue-500/20 hover:bg-blue-500/40 border-blue-500/50'; // Non-metals/Gases
        if (['SODIUM', 'POTASSIUM'].includes(chem.id)) return 'bg-orange-500/20 hover:bg-orange-500/40 border-orange-500/50'; // Alkali metals
        if (['MAGNESIUM'].includes(chem.id)) return 'bg-yellow-500/20 hover:bg-yellow-500/40 border-yellow-500/50'; // Alkaline earth
        // Transition metals & others
        return 'bg-purple-500/20 hover:bg-purple-500/40 border-purple-500/50';
    };

    const handleSpawn = (id: string) => {
        onSpawn(id);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
            <div className="bg-[#0f172a] rounded-2xl border border-slate-700 shadow-[0_0_30px_rgba(6,182,212,0.15)] w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">

                {/* Header */}
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-[#1e293b]">
                    <h2 className="text-lg font-bold text-slate-200 tracking-wider">
                        {lang === 'VN' ? 'BẢNG TUẦN HOÀN & VẬT TƯ' : 'PERIODIC TABLE & SUPPLIES'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors p-1"
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-8">

                    {/* Basic Elements Section */}
                    <div>
                        <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-widest mb-4 border-b border-cyan-900/50 pb-2">
                            {lang === 'VN' ? 'Cơ Bản (Nguyên Tố)' : 'Basic (Elements)'}
                        </h3>
                        <div className="flex flex-wrap gap-3">
                            {basicChemicals.map(chem => (
                                <button
                                    key={chem.id}
                                    onClick={() => handleSpawn(chem.id)}
                                    className={`w-20 h-20 rounded-xl border flex flex-col items-center justify-center relative transition-all group ${getBgColor(chem)} shadow-sm hover:shadow-md hover:-translate-y-1`}
                                >
                                    {chem.atomicNumber && (
                                        <span className="absolute top-1 left-1.5 text-[10px] font-bold text-slate-400 group-hover:text-slate-200">
                                            {chem.atomicNumber}
                                        </span>
                                    )}
                                    <span className="text-2xl font-extrabold text-slate-100 mt-2 mb-1 drop-shadow-sm">
                                        {chem.formula}
                                    </span>
                                    <span className="text-[9px] text-slate-300 font-medium truncate w-full px-1 text-center opacity-80 group-hover:opacity-100">
                                        {chem.name[lang]}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Advanced Compounds Section */}
                    <div>
                        <h3 className="text-sm font-bold text-purple-400 uppercase tracking-widest mb-4 border-b border-purple-900/50 pb-2">
                            {lang === 'VN' ? 'Nâng Cao (Hợp Chất)' : 'Advanced (Compounds)'}
                        </h3>
                        <div className="flex flex-wrap gap-3">
                            {advancedChemicals.map(chem => (
                                <button
                                    key={chem.id}
                                    onClick={() => handleSpawn(chem.id)}
                                    className={`h-16 px-4 rounded-xl border flex flex-col items-center justify-center relative transition-all group ${getBgColor(chem)} shadow-sm hover:shadow-md hover:-translate-y-0.5`}
                                >
                                    <span className="text-base font-bold text-slate-100 drop-shadow-sm">
                                        {chem.formula}
                                    </span>
                                    <span className="text-[10px] text-slate-300 font-medium truncate opacity-80 group-hover:opacity-100 mt-0.5">
                                        {chem.name[lang]}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default PeriodicTableModal;
