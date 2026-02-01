import { ContainerState } from './types';

export interface Quest {
    id: string;
    title: string;
    description: string;
    criteria: (containers: ContainerState[], lastReaction: string | null) => boolean;
    isCompleted: boolean;
    rewardMessage: string;
}

export const QUESTS: Quest[] = [
    {
        id: 'orientation_pour',
        title: 'Basic Handling',
        description: 'Pour Water into a Beaker. (Right-Click and Hold to pour)',
        criteria: (containers, _) => {
            // Find a beaker with water
            return containers.some(c =>
                c.type === 'beaker' &&
                c.contents &&
                c.contents.chemicalId === 'H2O' &&
                c.contents.volume > 0.1
            );
        },
        isCompleted: false,
        rewardMessage: "Excellent. You have mastered basic fluid transfer."
    },
    {
        id: 'safety_neutralize',
        title: 'Safety Protocol',
        description: 'Neutralize Hydrochloric Acid (HCl) with Sodium Hydroxide (NaOH).',
        criteria: (_, lastReaction) => {
            return lastReaction?.includes('Neutralization') || false;
        },
        isCompleted: false,
        rewardMessage: "Safety protocols observed. Acid neutralized successfully."
    },
    {
        id: 'discovery_golden_rain',
        title: 'Golden Rain',
        description: 'Synthesize Lead Iodide crystals (PbNO3 + KI).',
        criteria: (containers, _) => {
            return containers.some(c => c.contents?.chemicalId === 'GOLDEN_RAIN');
        },
        isCompleted: false,
        rewardMessage: "A spectacular precipitation! You have created Golden Rain."
    }
];

export class QuestManager {
    private activeQuests: Quest[];
    public onQuestComplete: ((quest: Quest) => void) | null = null;

    constructor() {
        this.activeQuests = [...QUESTS];
    }

    check(containers: ContainerState[], lastReaction: string | null) {
        this.activeQuests.forEach(quest => {
            if (!quest.isCompleted && quest.criteria(containers, lastReaction)) {
                quest.isCompleted = true;
                if (this.onQuestComplete) this.onQuestComplete(quest);
            }
        });
    }

    getQuests() {
        return this.activeQuests;
    }
}
