import React, { useState, useCallback, useRef, useEffect } from 'react';
import * as THREE from 'three';
import LabScene from './components/LabScene';
import LabUI from './components/LabUI';
import { ContainerState, ChatMessage, ContainerType } from './types';
import { ChemistryEngine } from './systems/ChemistryEngine';
import { CHEMICALS, HEATER_POSITION } from './constants';
import { GeminiService } from './services/geminiService';
import { audioManager } from './utils/AudioManager';
import { QuestManager } from './systems/QuestManager';

const App: React.FC = () => {
    const aiServiceRef = useRef<GeminiService | null>(null);
    const questManagerRef = useRef<QuestManager | null>(null);
    const reactionTimeoutRef = useRef<number | null>(null);

    const initialContainers: ContainerState[] = [
        {
            id: 'beaker-1',
            type: 'beaker',
            position: [-1.5, 0.11, 0],
            contents: { chemicalId: 'H2O', volume: 0.6, color: CHEMICALS['H2O'].color, temperature: 25 }
        },
        {
            id: 'beaker-2',
            type: 'beaker',
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
        setChatHistory(service.getHistory());

        const qm = new QuestManager();
        qm.onQuestComplete = (quest) => {
             audioManager.playSuccess();
             service.chat(`[SYSTEM ALERT: QUEST COMPLETED] ${quest.rewardMessage}`);
        };
        questManagerRef.current = qm;

        return () => {
            if (reactionTimeoutRef.current) window.clearTimeout(reactionTimeoutRef.current);
        };
    }, []);

    // Check Quests Loop
    useEffect(() => {
        const interval = setInterval(() => {
             if (questManagerRef.current) {
                 questManagerRef.current.check(containers, lastReaction);
             }
        }, 500);
        return () => clearInterval(interval);
    }, [containers, lastReaction]);

    // Simulation Loop (Heating/Cooling + Kinetics)
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();

            setContainers(prev => prev.map(c => {
                if (!c.contents) return c;

                let updatedContents = { ...c.contents };
                let changed = false;

                // 1. Kinetics (Active Reaction)
                if (c.contents.activeReaction) {
                    const ar = c.contents.activeReaction;
                    const elapsed = now - ar.startTime;
                    const progress = Math.min(1.0, elapsed / ar.duration);

                    // Interpolate Color
                    const startC = new THREE.Color(ar.startColor);
                    const endC = new THREE.Color(ar.targetColor);
                    const currentC = startC.lerp(endC, progress);
                    updatedContents.color = '#' + currentC.getHexString();
                    changed = true;

                    // Completion
                    if (progress >= 1.0) {
                        updatedContents.activeReaction = null;
                        updatedContents.chemicalId = ar.productId; // Finalize product ID
                    }
                }

                // 2. Thermal Dynamics
                // 2D Distance check (ignore Y height)
                const dist = Math.sqrt(
                    Math.pow(c.position[0] - HEATER_POSITION[0], 2) +
                    Math.pow(c.position[2] - HEATER_POSITION[2], 2)
                );

                let newTemp = updatedContents.temperature || 25;

                // If close to heater position
                if (dist < 0.5) {
                    // Heating up (faster if smaller volume?)
                    newTemp = Math.min(800, newTemp + 2.5);
                } else {
                    // Cooling down to room temp
                    if (newTemp > 25) newTemp = Math.max(25, newTemp - 0.5);
                }

                if (newTemp !== updatedContents.temperature) {
                    updatedContents.temperature = newTemp;
                    changed = true;
                }

                if (changed) {
                    return { ...c, contents: updatedContents };
                }
                return c;
            }));
        }, 50); // 20Hz physics/kinetics loop for smoother color shifts
        return () => clearInterval(interval);
    }, []);

    const handleMoveContainer = useCallback((id: string, position: [number, number, number]) => {
        setContainers(prev => prev.map(c => c.id === id ? { ...c, position } : c));
    }, []);

    const handlePour = useCallback(async (sourceId: string, targetId: string) => {
        const source = containers.find(c => c.id === sourceId);
        const target = containers.find(c => c.id === targetId);

        if (!source || !target || !source.contents) return;

        // Restriction: Can only pour INTO a Vessel (Beaker/TestTube)
        if (target.type !== 'beaker' && target.type !== 'test_tube') return;

        // Restriction: Can only pour FROM a Source or another Vessel
        const isSourceItem = ['bottle', 'jar', 'rock', 'paper_wrap'].includes(source.type);

        const sourceChem = CHEMICALS[source.contents.chemicalId];

        // Logic: Pour amount depends on type
        // If it's a 'rock' type source (e.g. Sodium Chunk), we drop a specific amount (0.3 volume unit)
        // If it's liquid/powder, we pour up to 0.2
        const amountToPour = (source.type === 'rock' || sourceChem.type === 'solid') ? 0.3 : Math.min(0.2, source.contents.volume);

        if (amountToPour <= 0) return;

        const targetChemId = target.contents ? target.contents.chemicalId : 'H2O';
        const targetVol = target.contents ? target.contents.volume : 0;
        const targetTemp = target.contents?.temperature || 25;

        // Calculate Mix
        const mixResult = ChemistryEngine.mix(
            targetChemId, targetVol,
            source.contents.chemicalId, amountToPour,
            targetTemp
        );

        setContainers(prev => {
            const isReactionProduct = !!mixResult.reaction;
            const newTemp = mixResult.reaction?.temperature || targetTemp;

            const nextContainers = prev.map(c => {
                // Update Source
                if (c.id === sourceId) {
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
                            temperature: isReactionProduct ? newTemp : targetTemp,
                            activeReaction: mixResult.activeReaction // Pass the kinetic state if any
                        }
                    };
                }
                return c;
            });

            // Cleanup empty sources (garbage collection)
            return nextContainers.filter(c => {
                 if (c.id === sourceId) {
                     if (c.contents === null) return false;
                 }
                 return true;
            });
        });

        if (mixResult.reaction) {
            setLastReaction(mixResult.reaction.message);
            setLastEffect(mixResult.reaction.effect || null);
            setLastEffectPos(target.position);

            // Audio Effects
            if (mixResult.reaction.effect === 'explosion') audioManager.playExplosion();
            else if (mixResult.reaction.effect === 'bubbles' || mixResult.reaction.effect === 'foam') audioManager.playFizz();

            if (reactionTimeoutRef.current) window.clearTimeout(reactionTimeoutRef.current);
            reactionTimeoutRef.current = window.setTimeout(() => {
                setLastReaction(null);
                setLastEffect(null);
                setLastEffectPos(null);
            }, 6000);

            if (aiServiceRef.current) {
                setIsAiLoading(true);
                const detail = `Mixed ${source.contents.chemicalId} into ${targetChemId}. Produced ${mixResult.reaction.productName}.`;
                // If it's a kinetic reaction, mention it
                const kineticNote = mixResult.activeReaction ? ` The reaction is proceeding slowly over ${(mixResult.activeReaction.duration / 1000).toFixed(1)}s.` : '';
                await aiServiceRef.current.chat(`[SYSTEM ALERT: EXPERIMENT PERFORMED] ${detail}${kineticNote}`);
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
        audioManager.playGlassClink();
        const isBeaker = chemId === 'BEAKER';
        const isTestTube = chemId === 'TEST_TUBE';

        const newId = isBeaker ? `beaker-${Date.now()}` :
                      isTestTube ? `tube-${Date.now()}` :
                      `source_${chemId}_${Date.now()}`;

        const chem = CHEMICALS[chemId];
        let containerType: ContainerType = 'bottle'; // Default

        if (isBeaker) containerType = 'beaker';
        else if (isTestTube) containerType = 'test_tube';
        else {
            // Determine source type based on chemical properties
            if (chem.meshStyle === 'rock' || chem.id === 'SODIUM' || chem.id === 'POTASSIUM' || chem.id === 'IRON') {
                containerType = 'rock';
            } else if (chem.type === 'solid') {
                containerType = 'jar';
            } else {
                containerType = 'bottle';
            }
        }

        const x = (Math.random() - 0.5) * 6;
        const y = (containerType === 'beaker' || containerType === 'test_tube') ? 0.11 : 0.56;
        const z = (containerType === 'beaker' || containerType === 'test_tube') ? (Math.random() * 2) : -3.5;

        setContainers(prev => [
            ...prev,
            {
                id: newId,
                type: containerType,
                position: [x, y, z],
                initialPosition: (containerType === 'beaker' || containerType === 'test_tube') ? undefined : [x, y, z],
                contents: (isBeaker || isTestTube)
                    ? null
                    : { chemicalId: chemId, volume: 1.0, color: chem.color, temperature: 25 },
                label: chem ? chem.name : undefined
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
                quests={questManagerRef.current?.getQuests() || []}
                onSpawn={handleSpawn}
                onReset={handleReset}
                onUserChat={handleUserChat}
            />
        </div>
    );
};

export default App;
