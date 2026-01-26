import React, { useState, useCallback, useRef, useEffect } from 'react';
import LabScene from './components/LabScene';
import LabUI from './components/LabUI';
import { ContainerState } from './types';
import { ChemistryEngine } from './systems/ChemistryEngine';
import { CHEMICALS } from './constants';
import { GeminiService } from './services/geminiService';

const App: React.FC = () => {
    const aiServiceRef = useRef<GeminiService | null>(null);
    const reactionTimeoutRef = useRef<number | null>(null);

    const initialContainers: ContainerState[] = [
        {
            id: 'beaker-1',
            position: [-1.5, 0, 0],
            contents: { chemicalId: 'H2O', volume: 0.6, color: CHEMICALS['H2O'].color, temperature: 25 }
        },
        {
            id: 'beaker-2',
            position: [1.5, 0, 0],
            contents: null
        }
    ];

    const [containers, setContainers] = useState<ContainerState[]>(initialContainers);
    const [lastReaction, setLastReaction] = useState<string | null>(null);
    const [lastEffect, setLastEffect] = useState<string | null>(null);
    const [aiFeedback, setAiFeedback] = useState<string>("Greetings, apprentice! Ready to probe the mysteries of matter?");
    const [isAiLoading, setIsAiLoading] = useState(false);

    useEffect(() => {
        aiServiceRef.current = new GeminiService();
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

            // Garbage Collection: Filter out empty containers that were just used as sources
            const nextContainers = prev.map(c => {
                // Update Source (if it's a beaker/mixable)
                if (c.id === sourceId && !isSourceItem) {
                    const newVol = Math.max(0, c.contents!.volume - amountToPour);
                    return {
                        ...c,
                        contents: newVol < 0.05 ? null : { ...c.contents!, volume: newVol }
                    };
                }
                // Update Target
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

            // Remove source completely if it was consumed in a reaction (e.g. Sodium rock into Water)
            // OR if it's a source item that is now empty (e.g. empty bottle)
            // OR if it's a beaker that was used as source and is now empty (cleanup)
            return nextContainers.filter(c => {
                 if (c.id === sourceId) {
                     // If it was a reaction, the source (reactant) is consumed
                     if (isReactionProduct) return false;
                     // If it's a generic beaker source and now empty, remove it to keep table clean
                     if (!isSourceItem && c.contents === null) return false;
                     // If it's a source item (bottle) and empty (volume logic not tracked for source_ yet, assumed 1.0 but lets say we want to keep them or remove?)
                     // User said "leaves both substance on the table".
                     // If I drop Sodium (source_SODIUM) into Water, it's a reaction, so it returns false above.
                     // If I pour Water (source_BEAKER) into Beaker, the source beaker empties.
                 }
                 return true;
            });
        });

        if (mixResult.reaction) {
            setLastReaction(mixResult.reaction.message);
            setLastEffect(mixResult.reaction.effect || null);

            if (reactionTimeoutRef.current) window.clearTimeout(reactionTimeoutRef.current);
            reactionTimeoutRef.current = window.setTimeout(() => {
                setLastReaction(null);
                setLastEffect(null);
            }, 6000);

            const detail = `Experimental event: Mixed ${source.contents.chemicalId} into ${targetChemId}. Produced ${mixResult.reaction.productName}. Atmosphere: ${mixResult.reaction.message}. Temperature reached: ${mixResult.reaction.temperature || 'Ambient'}`;

            if (aiServiceRef.current) {
                setIsAiLoading(true);
                const feedback = await aiServiceRef.current.chat(`Observation: ${detail}`, "Student performed an experiment.");
                setAiFeedback(feedback);
                setIsAiLoading(false);
            }
        }
    }, [containers]);

    const handleUserChat = async (message: string) => {
        if (aiServiceRef.current) {
            setIsAiLoading(true);
            const feedback = await aiServiceRef.current.chat(message, "Student is asking a question.");
            setAiFeedback(feedback);
            setIsAiLoading(false);
        }
    };

    const handleSpawn = (chemId: string) => {
        const isBeaker = chemId === 'BEAKER';
        const newId = isBeaker ? `beaker-${Date.now()}` : `source_${chemId}_${Date.now()}`;
        const chem = CHEMICALS[chemId];

        const x = (Math.random() - 0.5) * 6;
        const y = isBeaker ? 0 : 0.6;
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
        setAiFeedback("Laboratory sterilization complete. The molecular canvas is blank once more!");
    };

    return (
        <div className={`relative w-full h-screen bg-slate-950 transition-all duration-300 ${lastEffect === 'explosion' ? 'brightness-125' : ''}`}>
            <LabScene
                containers={containers}
                lastEffect={lastEffect}
                onMove={handleMoveContainer}
                onPour={handlePour}
            />
            <LabUI
                lastReaction={lastReaction}
                containers={containers}
                aiFeedback={aiFeedback}
                isAiLoading={isAiLoading}
                onSpawn={handleSpawn}
                onReset={handleReset}
                onUserChat={handleUserChat}
            />
        </div>
    );
};

export default App;
