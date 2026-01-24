import React, { useState, useEffect } from 'react';
import { AIService } from '../systems/AIService';

interface TeacherInterfaceProps {
    lastReactionMessage: string | null;
    aiService: AIService;
}

const TeacherInterface: React.FC<TeacherInterfaceProps> = ({ lastReactionMessage, aiService }) => {
    const [aiResponse, setAiResponse] = useState<string>("Hello! I'm Prof. Gemini. Mix some chemicals and I'll explain the science!");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (lastReactionMessage) {
            fetchExplanation(lastReactionMessage);
        }
    }, [lastReactionMessage]);

    const fetchExplanation = async (message: string) => {
        setIsLoading(true);
        // If the message is from our registry, it's already quite good.
        // We can use it as a base or ask AI to elaborate.

        // "Simulated AI" check: If the message is detailed (from Registry), display it first.
        // Then try to fetch AI elaboration if API key exists.

        // For now, let's ask the AI to be the "Ultra" teacher.
        const response = await aiService.getFeedback(message);
        setAiResponse(response);
        setIsLoading(false);
    };

    return (
        <div className="absolute top-4 right-4 w-80 bg-white/90 backdrop-blur-md rounded-xl p-4 shadow-2xl border-2 border-indigo-200 z-50 transition-all hover:scale-105">
            <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-2xl animate-bounce">
                    👨‍🔬
                </div>
                <div>
                    <h3 className="font-bold text-indigo-900 text-lg">Prof. Gemini</h3>
                    <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-400 animate-pulse' : 'bg-green-500'}`} />
                        <span className="text-xs text-gray-500">{isLoading ? 'Thinking...' : 'Online'}</span>
                    </div>
                </div>
            </div>

            <div className="bg-indigo-50 rounded-lg p-3 min-h-[100px] text-sm text-indigo-900 font-medium leading-relaxed max-h-60 overflow-y-auto">
                {isLoading ? (
                    <div className="flex space-x-1 justify-center py-4">
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                ) : (
                    aiResponse
                )}
            </div>

            {/* Hint Button (Future Feature) */}
            <button
                className="mt-3 w-full py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg text-xs font-bold transition-colors"
                onClick={() => fetchExplanation("Give me a cool experiment idea using the chemicals I have!")}
            >
                💡 Give me a Hint!
            </button>
        </div>
    );
};

export default TeacherInterface;
