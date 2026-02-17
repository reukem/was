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
    const [explodedContainerId, setExplodedContainerId] = useState<string | null>(null);
    const [safetyScore, setSafetyScore] = useState(100);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);

    const [isHeaterOn, setIsHeaterOn] = useState(false);
    const isHeaterOnRef = useRef(false);

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

                // 2. Thermal Dynamics & Delayed Reactions
                const distToHeater = Math.sqrt(
                    Math.pow(c.position[0] - HEATER_POSITION[0], 2) +
                    Math.pow(c.position[2] - HEATER_POSITION[2], 2)
                );

                // Snap to Heater Logic
                const isOnHeater = distToHeater < 0.3;
                if (isOnHeater && !c.isOnHeater) {
                    // Snap position visually
                    // We don't modify position here to avoid fighting controls,
                    // but we mark it as 'on heater' for logic
                    changed = true;
                }

                let newTemp = updatedContents.temperature || 25;

                // Heating Logic
                if (isOnHeater && isHeaterOnRef.current) {
                    newTemp = Math.min(1500, newTemp + 2.0); // Faster heating
                } else {
                    // Newton's Law of Cooling (Simplified)
                    if (newTemp > 25) newTemp = Math.max(25, newTemp - 0.5);
                }

                if (newTemp !== updatedContents.temperature) {
                    updatedContents.temperature = newTemp;
                    changed = true;
                }

                // 3. Check for Thermal Decomposition / Auto-Ignition
                const chem = CHEMICALS[updatedContents.chemicalId];
                if (chem && chem.thermalDecomposition) {
                    if (newTemp >= chem.thermalDecomposition.minTemperature) {
                        // TRIGGER DECOMPOSITION
                        const decomp = chem.thermalDecomposition;
                        updatedContents.chemicalId = decomp.product;
                        updatedContents.color = CHEMICALS[decomp.product].color;

                        // Side Effects
                        setLastReaction(decomp.message);
                        setLastEffect(decomp.effect || null);
                        setLastEffectPos(c.position);

                        if (decomp.effect === 'explosion') {
                            audioManager.playExplosion();
                            setExplodedContainerId(c.id);
                            setSafetyScore(s => Math.max(0, s - 50));

                            // AI Scolding
                            if (aiServiceRef.current) {
                                setIsChatOpen(true);
                                aiServiceRef.current.chat(`[SYSTEM EVENT: EXPLOSION! The student caused a dangerous explosion. Scold them severely but playfully about lab safety rules in Vietnamese.]`);
                            }

                            // Reset shattered container after 5s
                            setTimeout(() => {
                                setExplodedContainerId(null);
                                // Respawn or reset? Just hide visual damage for now.
                                // Actually user wants "Fail-Safe Virtual Restart" for that beaker
                                setContainers(prev => prev.map(con =>
                                    con.id === c.id ? { ...con, contents: null, position: con.initialPosition || [0, 0.11, 0] } : con
                                ));
                            }, 5000);
                        } else {
                             audioManager.playFizz();
                             if (aiServiceRef.current) {
                                setIsChatOpen(true);
                                aiServiceRef.current.chat(`[OBSERVATION] Phản ứng nhiệt phân thành công! ${chem.name} đã chuyển thành ${CHEMICALS[decomp.product].name}.`);
                             }
                        }

                        changed = true;
                    }
                }

                if (changed) {
                    return { ...c, contents: updatedContents, isOnHeater };
                }
                return c;
            }));
        }, 50); // 20Hz physics/kinetics loop for smoother color shifts
        return () => clearInterval(interval);
    }, []);

    const handleToggleHeater = useCallback(() => {
        setIsHeaterOn(prev => {
            const newState = !prev;
            isHeaterOnRef.current = newState;
            if (newState) audioManager.playGasHiss();
            else audioManager.stopGasHiss();
            return newState;
        });
    }, []);

    const handleMoveContainer = useCallback((id: string, position: [number, number, number]) => {
        setContainers(prev => prev.map(c => c.id === id ? { ...c, position } : c));
    }, []);

    const handlePour = useCallback(async (sourceId: string, targetId: string, amountOverride?: number) => {
        const source = containers.find(c => c.id === sourceId);
        const target = containers.find(c => c.id === targetId);

        if (!source || !target || !source.contents) return;

        // Restriction: Can only pour INTO a Vessel (Beaker/TestTube)
        if (target.type !== 'beaker' && target.type !== 'test_tube') return;

        const sourceChem = CHEMICALS[source.contents.chemicalId];

        // Logic: Pour amount depends on type
        // If it's a 'rock' type source, we drop a fixed chunk (unless continuous pouring is requested, but rocks usually drop whole)
        // If it's liquid/powder, use the override (dt based) or a default chunk
        let amountToPour = amountOverride || 0.2;

        // Special case: Rocks/Solids usually drop in chunks, but if we want smooth pouring of powder, allow override
        if ((source.type === 'rock' || sourceChem.type === 'solid') && !amountOverride) {
            amountToPour = 0.3;
        } else {
             amountToPour = Math.min(amountToPour, source.contents.volume);
        }

        if (amountToPour <= 0.0001) return;

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
                        contents: newVol < 0.001 ? null : { ...c.contents!, volume: newVol }
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
            // Debounce Reaction Effects (Don't spam if same reaction continues)
            setLastReaction(prev => {
                if (prev === mixResult.reaction!.message) return prev;

                // New Reaction Event
                setLastEffect(mixResult.reaction!.effect || null);
                setLastEffectPos(target.position);

                // Audio Effects
                if (mixResult.reaction!.effect === 'explosion') audioManager.playExplosion();
                else if (mixResult.reaction!.effect === 'bubbles' || mixResult.reaction!.effect === 'foam') audioManager.playFizz();

                if (reactionTimeoutRef.current) window.clearTimeout(reactionTimeoutRef.current);
                reactionTimeoutRef.current = window.setTimeout(() => {
                    setLastReaction(null);
                    setLastEffect(null);
                    setLastEffectPos(null);
                }, 6000);

                if (aiServiceRef.current) {
                    // We don't await here to avoid blocking the render loop
                    const detail = `Đã trộn ${CHEMICALS[source.contents.chemicalId].name} (${source.contents.chemicalId}) vào ${CHEMICALS[targetChemId].name} (${targetChemId}). Tạo ra ${mixResult.reaction!.productName}.`;
                    const kineticNote = mixResult.activeReaction ? ` Phản ứng diễn ra trong ${(mixResult.activeReaction.duration / 1000).toFixed(1)}s.` : '';
                    setIsChatOpen(true);
                    aiServiceRef.current.chat(`[OBSERVATION] ${detail}${kineticNote}`).catch(() => {});
                }
                return mixResult.reaction!.message;
            });
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
                explodedContainerId={explodedContainerId}
                onMove={handleMoveContainer}
                onPour={handlePour}
                isHeaterOn={isHeaterOn}
                onToggleHeater={handleToggleHeater}
            />
            <LabUI
                lastReaction={lastReaction}
                containers={containers}
                chatHistory={chatHistory}
                isAiLoading={isAiLoading}
                quests={questManagerRef.current?.getQuests() || []}
                safetyScore={safetyScore}
                isChatOpen={isChatOpen}
                onToggleChat={setIsChatOpen}
                onSpawn={handleSpawn}
                onReset={handleReset}
                onUserChat={handleUserChat}
            />
        </div>
    );
};

export default App;
