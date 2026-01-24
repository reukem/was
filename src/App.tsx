import React, { useState, useCallback, useEffect, useMemo } from 'react';
import LabScene from './components/LabScene';
import LabUI from './components/LabUI';
import { ContainerState } from './types/ChemistryTypes';
import { ChemistrySystem } from './systems/ChemistrySystem';
import { CHEMICALS } from './systems/ChemicalDatabase';
import { AIService } from './systems/AIService';

const ChemistryLab: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>(import.meta.env.VITE_GEMINI_API_KEY || '');

  // Memoize AI Service so it updates when key changes
  const aiService = useMemo(() => new AIService(apiKey), [apiKey]);

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
          { id: 'LEMON_JUICE', x: -3.5 },
          { id: 'BAKING_SODA', x: -2.5 },
          { id: 'VINEGAR', x: -1.5 },
          { id: 'SODIUM', x: -0.5 },
          { id: 'CHLORINE', x: 0.5 },
          { id: 'BLEACH', x: 1.5 },
          { id: 'RADIUM', x: 2.5 },
          { id: 'INDICATOR', x: 3.5 }
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

  const handleMoveContainer = useCallback((id: string, position: [number, number, number]) => {
      setContainers(prev => prev.map(c => c.id === id ? { ...c, position } : c));
  }, []);

  const handlePour = useCallback((sourceId: string, targetId: string) => {
      // Find source and target in the *current* state (we need to access state inside callback)
      // Since we are inside a callback, we should use functional update or rely on `containers` dependency.
      // `containers` is in dependency array, so this function recreates on change.

      const source = containers.find(c => c.id === sourceId);
      const target = containers.find(c => c.id === targetId);

      if (!source || !target || !source.contents) return;

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
          // Send specific detailed message for AI
          const detail = `${mixResult.reaction.message} (Result: ${mixResult.reaction.productName})`;
          setLastReaction(detail);
      } else {
          setLastReaction(null);
      }

  }, [containers]);

  const handleSpawn = (chemId: string) => {
      const x = (Math.random() - 0.5) * 4;
      const z = (Math.random() - 0.5) * 2;

      if (chemId === 'BEAKER') {
          const newId = `c_${Date.now()}`;
          setContainers(prev => [
              ...prev,
              {
                  id: newId,
                  position: [x, 2, z],
                  rotation: [0, 0, 0],
                  contents: { chemicalId: 'H2O', volume: 0, color: '#ffffff' }
              }
          ]);
      } else {
          const chem = CHEMICALS[chemId];
          if (chem) {
              const newId = `source_${chemId}_${Date.now()}`;
              setContainers(prev => [
                  ...prev,
                  {
                      id: newId,
                      position: [x, 2, z],
                      rotation: [0, 0, 0],
                      contents: { chemicalId: chemId, volume: 1.0, color: chem.color }
                  }
              ]);
          }
      }
  };

  const handleReset = () => {
      setContainers(createInitialState());
      setLastReaction(null);
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
            onSpawn={handleSpawn}
            onReset={handleReset}
            aiService={aiService}
        />
    </div>
  );
};

export default ChemistryLab;
