import React, { useState, useCallback, useRef, useEffect } from 'react';
import LabScene from './components/LabScene';
import LabUI from './components/LabUI';
import { ContainerState, ChatMessage } from './types';
import { ChemistryEngine } from './systems/ChemistryEngine';
import { CHEMICALS } from './constants';
import { GeminiService } from './services/geminiService';

const App: React.FC = () => {
    const aiServiceRef = useRef<GeminiService | null>(null);
    const reactionTimeoutRef = useRef<number | null>(null);

    const initialContainers: ContainerState[] = [
        {
            id: 'beaker-1',
            position: [-1.5, 0.11, 0], // Corrected height for table
            contents: { chemicalId: 'H2O', volume: 0.6, color: CHEMICALS['H2O'].color, temperature: 25 }
        },
        {
            id: 'beaker-2',
            position: [1.5, 0.11, 0],
            contents: null
        }
    ];

    const [containers, setContainers] = useState<ContainerState[]>(initialContainers);
    const [lastReaction, setLastReaction] = useState<string | null>(null);
    const [lastEffect, setLastEffect] = useState<string | null>(null);
    const [lastEffectPos, setLastEffectPos] = useState<[number, number, number] | null>(null);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [isAiLoading, setIsAiLoading] = useState(false);

    useEffect(() => {
        const service = new GeminiService();
        service.onHistoryUpdate = (history) => {
            setChatHistory([...history]);
        };
        aiServiceRef.current = service;

        // Initial sync
        setChatHistory(service.getHistory());

        return () => {
            if (reactionTimeoutRef.current) window.clearTimeout(reactionTimeoutRef.current);
        };
    }, []);

    const handleMoveContainer = useCallback((id: string, position: [number, number, number]) => {
        setContainers(prev => prev.map(c => c.id === id ? { ...c, position } : c));
    }, []);

    const handlePour = useCallback(async (sourceId: string, targetId: string) => {
        const source = containers.find(c => c.id === sourceId);
        const target = containers.find(c => c.id === targetId);

        if (!source || !target || !source.contents) return;

        const isSourceItem = sourceId.startsWith('source_');
        const sourceChem = CHEMICALS[source.contents.chemicalId];

        const amountToPour = sourceChem.type === 'solid' ? 0.3 : Math.min(0.2, source.contents.volume);
        if (amountToPour <= 0) return;

        const targetChemId = target.contents ? target.contents.chemicalId : 'H2O';
        const targetVol = target.contents ? target.contents.volume : 0;
        const targetTemp = target.contents?.temperature || 25;

        const mixResult = ChemistryEngine.mix(
            targetChemId, targetVol,
            source.contents.chemicalId, amountToPour
        );

        setContainers(prev => {
            const isReactionProduct = !!mixResult.reaction;
            const newTemp = mixResult.reaction?.temperature || targetTemp;

            const nextContainers = prev.map(c => {
                if (c.id === sourceId && !isSourceItem) {
                    const newVol = Math.max(0, c.contents!.volume - amountToPour);
                    return {
                        ...c,
                        contents: newVol < 0.05 ? null : { ...c.contents!, volume: newVol }
                    };
                }
                if (c.id === targetId) {
                     return {
                        ...c,
                        contents: {
                            chemicalId: mixResult.resultId,
                            volume: Math.min(1.0, targetVol + amountToPour),
                            color: mixResult.resultColor,
                            temperature: isReactionProduct ? newTemp : targetTemp
                        }
                    };
                }
                return c;
            });

            return nextContainers.filter(c => {
                 if (c.id === sourceId) {
                     if (isReactionProduct) return false;
                     if (!isSourceItem && c.contents === null) return false;
                 }
                 return true;
            });
        });

        if (mixResult.reaction) {
            setLastReaction(mixResult.reaction.message);
            setLastEffect(mixResult.reaction.effect || null);
            setLastEffectPos(target.position);

            if (reactionTimeoutRef.current) window.clearTimeout(reactionTimeoutRef.current);
            reactionTimeoutRef.current = window.setTimeout(() => {
                setLastReaction(null);
                setLastEffect(null);
                setLastEffectPos(null);
            }, 6000);

            // Trigger AI feedback
            if (aiServiceRef.current) {
                setIsAiLoading(true);
                const detail = `Mixed ${source.contents.chemicalId} into ${targetChemId}. Produced ${mixResult.reaction.productName}.`;
                // Fire and forget, state updates via callback
                await aiServiceRef.current.chat(`[SYSTEM ALERT: EXPERIMENT PERFORMED] ${detail}`);
                setIsAiLoading(false);
            }
        }
    }, [containers]);

    const handleUserChat = async (message: string) => {
        if (aiServiceRef.current) {
            setIsAiLoading(true);
            await aiServiceRef.current.chat(message);
            setIsAiLoading(false);
        }
    };

    const handleSpawn = (chemId: string) => {
        const isBeaker = chemId === 'BEAKER';
        const newId = isBeaker ? `beaker-${Date.now()}` : `source_${chemId}_${Date.now()}`;
        const chem = CHEMICALS[chemId];

        const x = (Math.random() - 0.5) * 6;
        const y = isBeaker ? 0.11 : 0.56; // Corrected spawn heights
        const z = isBeaker ? (Math.random() * 2) : -3.5;

        setContainers(prev => [
            ...prev,
            {
                id: newId,
                position: [x, y, z],
                initialPosition: isBeaker ? undefined : [x, y, z],
                contents: isBeaker
                    ? null
                    : { chemicalId: chemId, volume: 1.0, color: chem.color, temperature: 25 }
            }
        ]);
    };

    const handleReset = () => {
        setContainers(initialContainers);
        setLastReaction(null);
        setLastEffect(null);
        setLastEffectPos(null);
        if (aiServiceRef.current) {
            aiServiceRef.current.startNewChat();
        }
    };

    return (
        <div className={`relative w-full h-screen bg-slate-950 transition-all duration-300 ${lastEffect === 'explosion' ? 'brightness-125' : ''}`}>
            <LabScene
                containers={containers}
                lastEffect={lastEffect}
                lastEffectPos={lastEffectPos}
                onMove={handleMoveContainer}
                onPour={handlePour}
            />
            <LabUI
                lastReaction={lastReaction}
                containers={containers}
                chatHistory={chatHistory}
                isAiLoading={isAiLoading}
                onSpawn={handleSpawn}
                onReset={handleReset}
                onUserChat={handleUserChat}
            />
        </div>
    );
};

export default App;
