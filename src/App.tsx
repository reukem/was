import React, { useState, useCallback, useEffect, useRef } from 'react';
import LabScene from './components/LabScene';
import LabUI from './components/LabUI';
import { ContainerState } from './types/ChemistryTypes';
import { ChemistrySystem } from './systems/ChemistrySystem';
import { CHEMICALS } from './systems/ChemicalDatabase';
import { AIService } from './systems/AIService';

const ChemistryLab: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>(import.meta.env.VITE_GEMINI_API_KEY || '');
  const aiServiceRef = useRef<AIService | null>(null);

  // Initial State setup
  const createInitialState = (): ContainerState[] => {
      const items: ContainerState[] = [];

      // 1. Mixing Vessel (Center Table)
      items.push({
          id: 'MIXING_VESSEL',
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          contents: { chemicalId: 'H2O', volume: 0.5, color: CHEMICALS['H2O'].color }
      });

      // 2. Shelf Items
      const shelfItems = [
          { id: 'LEMON_JUICE', x: -3 },
          { id: 'VINEGAR', x: -2 },
          { id: 'BAKING_SODA', x: -1 },
          { id: 'SOAP', x: 0 },
          { id: 'BLEACH', x: 1 },
          { id: 'SUGAR', x: 2 },
          { id: 'RADIUM', x: 3 }
      ];

      shelfItems.forEach(item => {
          items.push({
              id: `source_${item.id}`,
              position: [item.x, 0.6, -2], // On Shelf
              rotation: [0, 0, 0],
              contents: { chemicalId: item.id, volume: 1.0, color: CHEMICALS[item.id].color }
          });
      });

      return items;
  };

  const [containers, setContainers] = useState<ContainerState[]>(createInitialState());
  const [lastReaction, setLastReaction] = useState<string | null>(null);
  const [aiFeedback, setAiFeedback] = useState<string>("Hello students! I am Prof. Gemini. Let's do some safe science!");
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
      aiServiceRef.current = new AIService(apiKey);
  }, [apiKey]);

  const handleMoveContainer = useCallback((id: string, position: [number, number, number]) => {
      setContainers(prev => prev.map(c => c.id === id ? { ...c, position } : c));
  }, []);

  const handlePour = useCallback(async (sourceId: string, targetId: string) => {
      const source = containers.find(c => c.id === sourceId);
      const target = containers.find(c => c.id === targetId);

      if (!source || !target || !source.contents) return;

      // Logic:
      // If source is a "Source" (Infinite supply), we add a fixed amount.
      // If source is a beaker, we pour existing amount.
      // But for this simplified version, let's say "pouring" from a source adds 0.2 volume.

      const isSource = sourceId.startsWith('source_');
      const amountToPour = isSource ? 0.2 : Math.min(0.1, source.contents.volume);

      if (amountToPour <= 0 && !isSource) return;

      const targetChemId = target.contents ? target.contents.chemicalId : 'H2O';
      const targetVol = target.contents ? target.contents.volume : 0;

      const mixResult = ChemistrySystem.mix(
          targetChemId, targetVol,
          source.contents.chemicalId, amountToPour
      );

      setContainers(prev => {
           return prev.map(c => {
              // If it's a normal beaker source, reduce volume
              if (c.id === sourceId && !isSource) {
                  return { ...c, contents: { ...c.contents!, volume: c.contents!.volume - amountToPour } };
              }
              // Update target
              if (c.id === targetId) {
                  return {
                      ...c,
                      contents: {
                          chemicalId: mixResult.resultId,
                          volume: Math.min(1.0, targetVol + amountToPour), // Cap at 1.0
                          color: mixResult.resultColor
                      }
                  };
              }
              return c;
           });
      });

      if (mixResult.reaction) {
          setLastReaction(mixResult.reaction.message);
          const eventDescription = `Mixed ${source.contents.chemicalId} into ${targetChemId}. Result: ${mixResult.reaction.productName}. ${mixResult.reaction.message}`;

          if (aiServiceRef.current) {
              setIsAiLoading(true);
              const systemPrompt = "You are Prof. Gemini, a friendly and encouraging chemistry teacher for kids. Explain the reaction simply and safely.";
              const feedback = await aiServiceRef.current.getFeedback(eventDescription, systemPrompt); // Note: Update AIService if needed to accept prompt
              setAiFeedback(feedback);
              setIsAiLoading(false);
          }
      } else {
          setLastReaction(null);
      }

  }, [containers]);

  const handleSpawn = (chemId: string) => {
     // Optional: User might still want to spawn extra beakers
     // ...
  };

  const handleReset = () => {
      setContainers(createInitialState());
      setLastReaction(null);
      setAiFeedback("Lab reset. Ready for new experiments.");
  };

  return (
    <div className="lab-container">
        <LabScene
            containers={containers}
            onMove={handleMoveContainer}
            onPour={handlePour}
        />
        <LabUI
            apiKey={apiKey}
            setApiKey={setApiKey}
            lastReaction={lastReaction}
            containers={containers}
            aiFeedback={aiFeedback}
            isAiLoading={isAiLoading}
            onSpawn={handleSpawn}
            onReset={handleReset}
        />
    </div>
  );
};

export default ChemistryLab;
