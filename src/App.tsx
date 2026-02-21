import React, { useState, useCallback, useRef, useEffect } from 'react';
import * as THREE from 'three';
import LabScene from './components/LabScene';
import LabUI from './components/LabUI';
import MolecularView from './components/MolecularView';
import { ContainerState, ChatMessage, ContainerType } from './types';
import { ChemistryEngine } from './systems/ChemistryEngine';
import { CHEMICALS, HEATER_POSITION } from './constants';
import { GeminiService } from './services/geminiService';
import { audioManager } from './utils/AudioManager';
import { QuestManager } from './systems/QuestManager';
import { useStore } from './store';

const App: React.FC = () => {
    const aiServiceRef = useRef<GeminiService | null>(null);
    const { apiSettings } = useStore();
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
    const [isMolecularViewOpen, setIsMolecularViewOpen] = useState(false);
    const [molecularMode, setMolecularMode] = useState<'dissolve' | 'neutralization' | 'precipitation' | 'generic'>('generic');
    const [isExamMode, setIsExamMode] = useState(false);

    // Performance Mode State
    const [isPerformanceMode, setIsPerformanceMode] = useState(false);

    // Whiteboard State
    const [whiteboardContent, setWhiteboardContent] = useState<string | null>(null);

    const [isHeaterOn, setIsHeaterOn] = useState(false);
    const [heaterTemp, setHeaterTemp] = useState(300); // Default 300C
    const isHeaterOnRef = useRef(false);
    const heaterTempRef = useRef(300);

    useEffect(() => {
        // Initialize with key from store
        const service = new GeminiService(apiSettings.geminiKey);

        service.onHistoryUpdate = (history) => {
            setChatHistory([...history]);

            // Check for Triggers in the latest message
            const lastMsg = history[history.length - 1];
            if (lastMsg && lastMsg.role === 'model') {
                // Molecular View Trigger
                if (lastMsg.text.includes('[TRIGGER_MOLECULAR_VIEW]')) {
                    if (lastMsg.text.toLowerCase().includes('nacl') || lastMsg.text.toLowerCase().includes('muối')) {
                        setMolecularMode('dissolve');
                    } else if (lastMsg.text.toLowerCase().includes('trung hòa') || lastMsg.text.toLowerCase().includes('hcl')) {
                        setMolecularMode('neutralization');
                    } else {
                        setMolecularMode('generic');
                    }
                    setIsMolecularViewOpen(true);
                }

                // Whiteboard Trigger
                const wbMatch = lastMsg.text.match(/\[TRIGGER_WHITEBOARD:\s*(.*?)\]/);
                if (wbMatch && wbMatch[1]) {
                    setWhiteboardContent(wbMatch[1]);
                    // Optionally open chat if not open?
                    // setIsChatOpen(true);
                }
            }
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
    }, [apiSettings.geminiKey]); // Re-init when key changes

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
                    // Approach heater temp
                    const targetT = heaterTempRef.current;
                    if (newTemp < targetT) {
                        newTemp += (targetT - newTemp) * 0.05; // Exp approach
                    }
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

    const handleSetHeaterTemp = useCallback((t: number) => {
        setHeaterTemp(t);
        heaterTempRef.current = t;
    }, []);

    const handleToggleValve = useCallback((id: string) => {
        audioManager.playGlassClink();
        setContainers(prev => prev.map(c => {
            if (c.id === id) {
                return { ...c, isValveOpen: !c.isValveOpen };
            }
            return c;
        }));
    }, []);

    const handleTogglePerformance = useCallback(() => {
        setIsPerformanceMode(prev => !prev);
    }, []);

    // --- DRIP LOOP (BURETTE) ---
    useEffect(() => {
        const interval = setInterval(() => {
            setContainers(prev => {
                const burettes = prev.filter(c => c.type === 'burette' && c.isValveOpen && c.contents && c.contents.volume > 0);
                if (burettes.length === 0) return prev;

                let changed = false;
                const nextContainers = prev.map(c => ({...c}));

                burettes.forEach(buretteSource => {
                    const sourceIdx = nextContainers.findIndex(c => c.id === buretteSource.id);
                    if (sourceIdx === -1) return;

                    const source = nextContainers[sourceIdx];
                    if (!source.contents || source.contents.volume <= 0) return;

                    // Physics: dV/dt = -k * sqrt(h)
                    // h is proportional to volume
                    const flowRate = 0.01 * Math.sqrt(source.contents.volume);
                    const dripAmount = Math.min(flowRate, source.contents.volume);

                    // Find target
                    const tipPos = new THREE.Vector3(source.position[0], source.position[1] + 1.8, source.position[2] - 0.2);

                    const targetIdx = nextContainers.findIndex(t => {
                        if (t.id === source.id) return false;
                        if (t.type !== 'beaker') return false;
                        const dx = Math.abs(t.position[0] - tipPos.x);
                        const dz = Math.abs(t.position[2] - tipPos.z);
                        // Check if beaker is below tip
                        return dx < 0.4 && dz < 0.4 && t.position[1] < tipPos.y;
                    });

                    if (targetIdx !== -1) {
                        const target = nextContainers[targetIdx];
                        // MIX
                        const targetChemId = target.contents ? target.contents.chemicalId : 'H2O';
                        const targetVol = target.contents ? target.contents.volume : 0;
                        const targetTemp = target.contents?.temperature || 25;

                        const mixResult = ChemistryEngine.mix(
                            targetChemId, targetVol,
                            source.contents.chemicalId, dripAmount,
                            targetTemp
                        );

                        // Update Target
                        const isReactionProduct = !!mixResult.reaction;
                        nextContainers[targetIdx] = {
                            ...target,
                            contents: {
                                chemicalId: mixResult.resultId,
                                volume: Math.min(1.0, targetVol + dripAmount),
                                color: mixResult.resultColor,
                                temperature: isReactionProduct ? (mixResult.reaction?.temperature || targetTemp) : targetTemp,
                                activeReaction: mixResult.activeReaction
                            }
                        };
                    }

                    // Drain Source
                    nextContainers[sourceIdx] = {
                        ...source,
                        contents: { ...source.contents, volume: source.contents.volume - dripAmount }
                    };
                    changed = true;
                });

                return changed ? nextContainers : prev;
            });
        }, 100); // 10Hz Drip Loop
        return () => clearInterval(interval);
    }, []);

    const handleMoveContainer = useCallback((id: string, position: [number, number, number]) => {
        setContainers(prev => prev.map(c => {
            if (c.id === id) {
                // HEATER SNAP LOGIC (Module 3)
                const distToHeater = new THREE.Vector2(position[0], position[2])
                    .distanceTo(new THREE.Vector2(HEATER_POSITION[0], HEATER_POSITION[2]));

                if (distToHeater < 0.4 && (c.type === 'beaker')) {
                    // Snap to plate
                    return { ...c, position: [HEATER_POSITION[0], 0.36, HEATER_POSITION[2]], isOnHeater: true };
                }
                return { ...c, position, isOnHeater: false };
            }
            return c;
        }));
    }, []);

    // NEW: Handle Solid Drops (Sodium -> Water)
    const handleDrop = useCallback((sourceId: string, targetId: string) => {
        handlePour(sourceId, targetId, 1.0); // Pour everything (solid chunk)
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

                    // Capture current state snapshot for the observation
                    const labState = containers.map(c => ({
                         id: c.id,
                         contents: c.contents ? { chem: c.contents.chemicalId, vol: c.contents.volume.toFixed(2), temp: c.contents.temperature.toFixed(1) } : 'Empty'
                    }));

                    setIsChatOpen(true);
                    aiServiceRef.current.chat(`[OBSERVATION] ${detail}${kineticNote}`, { containers: labState, event: 'REACTION' }).catch(() => {});
                }
                return mixResult.reaction!.message;
            });
        }
    }, [containers]);

    const handleUserChat = async (message: string) => {
        if (aiServiceRef.current) {
            setIsAiLoading(true);

            // Construct context payload
            const labState = containers.map(c => ({
                id: c.id,
                type: c.type,
                contents: c.contents ? {
                    chemicalId: c.contents.chemicalId,
                    chemicalName: CHEMICALS[c.contents.chemicalId]?.name,
                    volume: c.contents.volume.toFixed(2),
                    temperature: c.contents.temperature.toFixed(1)
                } : 'Empty'
            }));

            await aiServiceRef.current.chat(message, { containers: labState, heaterOn: isHeaterOnRef.current });
            setIsAiLoading(false);
        }
    };

    const handleSpawn = (chemId: string) => {
        // Safety Limit
        if (containers.length >= 20) {
             if (aiServiceRef.current) aiServiceRef.current.chat("[SYSTEM ALERT] Bàn thí nghiệm đã đầy. Vui lòng dọn dẹp bớt.");
             return;
        }

        audioManager.playGlassClink();
        const isBeaker = chemId === 'BEAKER';
        const isTestTube = chemId === 'TEST_TUBE';
        const isBurette = chemId === 'BURETTE';

        const newId = isBeaker ? `beaker-${Date.now()}` :
                      isTestTube ? `tube-${Date.now()}` :
                      isBurette ? `burette-${Date.now()}` :
                      `source_${chemId}_${Date.now()}`;

        const chem = CHEMICALS[chemId];
        let containerType: ContainerType = 'bottle'; // Default

        if (isBeaker) containerType = 'beaker';
        else if (isTestTube) containerType = 'test_tube';
        else if (isBurette) containerType = 'burette';
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
        const y = (containerType === 'beaker' || containerType === 'test_tube' || containerType === 'burette') ? 0.11 : 0.56;
        const z = (containerType === 'beaker' || containerType === 'test_tube' || containerType === 'burette') ? (Math.random() * 2) : -3.5;

        setContainers(prev => [
            ...prev,
            {
                id: newId,
                type: containerType,
                position: [x, y, z],
                initialPosition: (containerType === 'beaker' || containerType === 'test_tube' || containerType === 'burette') ? undefined : [x, y, z],
                contents: (isBeaker || isTestTube)
                    ? null
                    : isBurette ? { chemicalId: 'HCl', volume: 1.0, color: '#fef08a', temperature: 25 } // Default fill burette with HCl
                    : { chemicalId: chemId, volume: 1.0, color: chem.color, temperature: 25 },
                label: chem ? chem.name : undefined
            }
        ]);
    };

    const handleReset = () => {
        setIsExamMode(false);
        setContainers(initialContainers);
        setLastReaction(null);
        setLastEffect(null);
        setLastEffectPos(null);
        setWhiteboardContent(null);
        if (aiServiceRef.current) {
            aiServiceRef.current.startNewChat();
        }
    };

    const handleStartExam = () => {
        setIsExamMode(true);
        setLastReaction(null);
        setWhiteboardContent(null);

        // Setup Exam Scene
        const samples = [
            { id: 'HCl', label: 'Mẫu Thử A' },
            { id: 'NaOH', label: 'Mẫu Thử B' },
            { id: 'H2O', label: 'Mẫu Thử C' }
        ].sort(() => Math.random() - 0.5); // Shuffle

        const newContainers: ContainerState[] = [];

        // Spawn Samples
        samples.forEach((s, idx) => {
            newContainers.push({
                id: `exam_sample_${idx}`,
                type: 'beaker',
                position: [(idx - 1) * 1.5, 0.11, 0],
                contents: {
                    chemicalId: s.id,
                    volume: 0.4,
                    color: '#ffffff', // Mask color to clear/white for difficulty? Or keep original?
                    // HCl is yellowish, NaOH clear, H2O clear.
                    // To make it harder, force all to clear?
                    // No, let slight visual cues exist. But HCl is actually clear in pure form usually.
                    // The app uses yellow for HCl. Let's keep it but maybe desaturate?
                    // Let's rely on standard colors.
                    temperature: 25
                },
                label: s.label
            });
        });

        // Spawn Tools (Phenolphthalein)
        newContainers.push({
            id: 'exam_indicator',
            type: 'bottle',
            position: [2.5, 0.56, 1.0],
            contents: { chemicalId: 'PHENOLPHTHALEIN', volume: 1.0, color: '#f8fafc', temperature: 25 },
            label: 'Phenolphthalein'
        });

        setContainers(newContainers);

        if (aiServiceRef.current) {
            const solutionMap = samples.map(s => `${s.label}=${s.id}`).join(', ');
            aiServiceRef.current.chat(`[SYSTEM: EXAM MODE STARTED. SAMPLES: ${solutionMap}. DO NOT REVEAL IDENTITY. GUIDE STUDENT TO USE INDICATORS.]`);
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
                onDrop={handleDrop}
                onToggleValve={handleToggleValve}
                isHeaterOn={isHeaterOn}
                onToggleHeater={handleToggleHeater}
                isPerformanceMode={isPerformanceMode}
                whiteboardContent={whiteboardContent}
                heaterTemp={heaterTemp} // Pass to Scene for visuals
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
                onStartExam={handleStartExam}
                isExamMode={isExamMode}
                onUserChat={handleUserChat}
                isPerformanceMode={isPerformanceMode}
                onTogglePerformance={handleTogglePerformance}
                heaterTemp={heaterTemp}
                onSetHeaterTemp={handleSetHeaterTemp}
            />
            {isMolecularViewOpen && (
                <MolecularView mode={molecularMode} onClose={() => setIsMolecularViewOpen(false)} />
            )}
        </div>
    );
};

export default App;
