const fs = require('fs');

const appFile = 'src/App.tsx';
let content = fs.readFileSync(appFile, 'utf8');

const oldForm = `<form onSubmit={onSubmit} className="p-3 bg-slate-900/50 border-t border-white/5">
                     <div className="relative">
                         <input
                             type="text"
                             value={chatInput}
                             onChange={(e) => setChatInput(e.target.value)}
                             placeholder="Hỏi Lucy..."
                             className="w-full bg-slate-950 border border-slate-700/80 rounded-xl py-2.5 px-4 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                         />
                         <button type="submit" disabled={isAiLoading || !chatInput.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-cyan-400 hover:text-cyan-300 disabled:opacity-50 transition-colors bg-cyan-900/20 hover:bg-cyan-900/40 rounded-lg">
                             <span className="text-sm">^</span>
                         </button>
                     </div>
                 </form>`;

const newForm = `<form onSubmit={onSubmit} className="p-3 bg-slate-900/50 border-t border-white/5">
                     <div className="relative flex items-center">
                         <textarea
                             value={chatInput}
                             onChange={(e) => {
                                 setChatInput(e.target.value);
                                 e.target.style.height = 'auto';
                                 e.target.style.height = \`\${Math.min(e.target.scrollHeight, 120)}px\`;
                             }}
                             onKeyDown={(e) => {
                                 if (e.key === 'Enter' && !e.shiftKey) {
                                     e.preventDefault();
                                     onSubmit(e as any);
                                 }
                             }}
                             placeholder="Hỏi Lucy..."
                             className="w-full bg-slate-950/50 border border-slate-700 rounded-xl py-2.5 pl-4 pr-10 text-xs text-slate-300 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 placeholder-slate-600 shadow-inner resize-none min-h-[40px] max-h-[120px] custom-scrollbar"
                             rows={1}
                         />
                         <button type="submit" disabled={isAiLoading || !chatInput.trim()} className="absolute right-2 bottom-1.5 w-7 h-7 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-400 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50">
                             <span className="text-sm -mt-0.5">^</span>
                         </button>
                     </div>
                 </form>`;

if (content.indexOf(oldForm) !== -1) {
    content = content.replace(oldForm, newForm);
    fs.writeFileSync(appFile, content);
    console.log("UI patches applied.");
} else {
    console.log("Old form block not found, couldn't replace.");
    // Attempting a regex fallback
    const formRegex = /<form onSubmit=\{onSubmit\}.*?<\/form>/s;
    content = content.replace(formRegex, newForm);
    fs.writeFileSync(appFile, content);
    console.log("UI patches applied via regex.");
}
