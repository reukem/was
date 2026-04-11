import React, { useState } from 'react';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// Simple local storage fallback since store is deleted
const getStoredKey = () => localStorage.getItem('gemini_api_key') || '';
const setStoredKey = (key: string) => {
    if (key) localStorage.setItem('gemini_api_key', key);
    else localStorage.removeItem('gemini_api_key');
};

const getStoredElevenLabsKey = () => localStorage.getItem('elevenlabs_api_key') || '';

const getStoredMuted = () => localStorage.getItem('lucy_is_muted') === 'true';
const getStoredLang = () => (localStorage.getItem('lucy_lang') as 'EN' | 'VN') || 'VN';

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    const [apiKey, setApiKey] = useState(getStoredKey());
    const [elevenLabsKey, setElevenLabsKey] = useState(getStoredElevenLabsKey());
    const [isMuted, setIsMuted] = useState(getStoredMuted());
    const [lang, setLang] = useState<'EN' | 'VN'>(getStoredLang());

    const handleSave = () => {
        setStoredKey(apiKey.trim());
        if (elevenLabsKey.trim()) localStorage.setItem('elevenlabs_api_key', elevenLabsKey.trim());
        else localStorage.removeItem('elevenlabs_api_key');
        localStorage.setItem('lucy_is_muted', String(isMuted));
        localStorage.setItem('lucy_lang', lang);
        // Force reload to pick up key and settings in App
        window.location.reload();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200" style={{ pointerEvents: 'auto' }}>
            <div className="bg-[#0f172a]/90 border border-indigo-500/30 p-8 rounded-[2rem] shadow-2xl w-[500px] max-w-full backdrop-blur-xl transform transition-all scale-100 ring-1 ring-white/10">
                <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 mb-6 tracking-tight flex items-center gap-3">
                    ⚙️ CÀI ĐẶT HỆ THỐNG
                </h2>

                <div className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                            Gemini API Key (BYOK)
                        </label>
                        <p className="text-[10px] text-slate-500 mb-3">
                            Nhập mã API Google Gemini của bạn để kích hoạt hệ thống Neural Engine nâng cao.
                            Không có mã, hệ thống sẽ chạy ở chế độ 'Offline' giới hạn.
                            Mã của bạn được lưu cục bộ trên trình duyệt.
                        </p>
                        <div className="relative">
                            <input
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="AIzaSy..."
                                className="w-full bg-slate-950/50 text-indigo-300 text-sm px-4 py-3 rounded-xl border border-white/10 focus:border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono"
                            />
                            {apiKey && (
                                <button
                                    onClick={() => setApiKey('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
                                >
                                    XÓA
                                </button>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                            ElevenLabs API Key (TTS)
                        </label>
                        <p className="text-[10px] text-slate-500 mb-3">
                            Nhập mã ElevenLabs API để sử dụng giọng nói Cloud chất lượng cao (VTuber).
                            Nếu để trống, hệ thống sẽ sử dụng giọng nói mặc định của trình duyệt (có thể bị giới hạn hoặc không hỗ trợ tiếng Việt).
                        </p>
                        <div className="relative">
                            <input
                                type="password"
                                value={elevenLabsKey}
                                onChange={(e) => setElevenLabsKey(e.target.value)}
                                placeholder="sk_..."
                                className="w-full bg-slate-950/50 text-indigo-300 text-sm px-4 py-3 rounded-xl border border-white/10 focus:border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono"
                            />
                            {elevenLabsKey && (
                                <button
                                    onClick={() => setElevenLabsKey('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
                                >
                                    XÓA
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                                Giọng Nói (TTS)
                            </label>
                            <button
                                onClick={() => setIsMuted(!isMuted)}
                                className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all ${
                                    isMuted
                                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                }`}
                            >
                                {isMuted ? '🔇 ĐÃ TẮT TIẾNG' : '🔊 ĐANG BẬT'}
                            </button>
                        </div>

                        <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                                Ngôn Ngữ
                            </label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setLang('VN')}
                                    className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
                                        lang === 'VN'
                                        ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                                        : 'bg-slate-800 text-slate-500 border border-slate-700'
                                    }`}
                                >
                                    🇻🇳 VN
                                </button>
                                <button
                                    onClick={() => setLang('EN')}
                                    className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
                                        lang === 'EN'
                                        ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                                        : 'bg-slate-800 text-slate-500 border border-slate-700'
                                    }`}
                                >
                                    🇬🇧 EN
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                        >
                            HỦY
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold tracking-wider shadow-lg shadow-indigo-500/20 transition-all hover:scale-105"
                        >
                            LƯU CẤU HÌNH
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
