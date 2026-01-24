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

  // Initial State
  const initialContainers: ContainerState[] = [
      {
          id: 'c1',
          position: [-2, 0, 0],
          rotation: [0, 0, 0],
          contents: { chemicalId: 'H2O', volume: 0.5, color: CHEMICALS['H2O'].color }
      },
      {
          id: 'c2',
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          contents: { chemicalId: 'INDICATOR', volume: 0.2, color: CHEMICALS['INDICATOR'].color }
      },
      {
          id: 'c3',
          position: [2, 0, 0],
          rotation: [0, 0, 0],
          contents: { chemicalId: 'HCl', volume: 0.3, color: CHEMICALS['HCl'].color }
      },
      {
          id: 'c4',
          position: [4, 0, 0],
          rotation: [0, 0, 0],
          contents: { chemicalId: 'NaOH', volume: 0.3, color: CHEMICALS['NaOH'].color }
      }
  ];

  const [containers, setContainers] = useState<ContainerState[]>(initialContainers);
  const [lastReaction, setLastReaction] = useState<string | null>(null);
  const [aiFeedback, setAiFeedback] = useState<string>("Welcome to the lab! I am Professor Alchemist. Start mixing!");
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

      if (!source || !target || !source.contents || source.contents.volume <= 0) return;

      const amountToPour = Math.min(0.1, source.contents.volume);
      const targetChemId = target.contents ? target.contents.chemicalId : 'H2O';
      const targetVol = target.contents ? target.contents.volume : 0;

      const mixResult = ChemistrySystem.mix(
          targetChemId, targetVol,
          source.contents.chemicalId, amountToPour
      );

      setContainers(prev => {
           return prev.map(c => {
              if (c.id === sourceId) {
                  return { ...c, contents: { ...c.contents!, volume: c.contents!.volume - amountToPour } };
              }
              if (c.id === targetId) {
                  return {
                      ...c,
                      contents: {
                          chemicalId: mixResult.resultId,
                          volume: targetVol + amountToPour,
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
              const feedback = await aiServiceRef.current.getFeedback(eventDescription);
              setAiFeedback(feedback);
              setIsAiLoading(false);
          }
      } else {
          setLastReaction(null);
      }

  }, [containers]);

  const handleSpawn = (chemId: string) => {
      const chem = CHEMICALS[chemId];
      if (!chem) return;

      const newId = `c_${Date.now()}`;
      // Random position near center but spread out
      const x = (Math.random() - 0.5) * 4;
      const z = (Math.random() - 0.5) * 2;

      setContainers(prev => [
          ...prev,
          {
              id: newId,
              position: [x, 1, z], // Drop from height 1
              rotation: [0, 0, 0],
              contents: { chemicalId: chemId, volume: 0.5, color: chem.color }
          }
      ]);
  };

  const handleReset = () => {
      setContainers(initialContainers);
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
