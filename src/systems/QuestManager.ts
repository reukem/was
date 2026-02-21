import { ContainerState, Quest, ReactionEntry } from '../types';
import { CHEMICALS, REACTION_REGISTRY } from '../constants';

// Helper to format names
const formatName = (id: string) => CHEMICALS[id]?.name || id;

export class QuestManager {
    private activeQuests: Quest[] = [];
    public onQuestComplete: ((quest: Quest) => void) | null = null;

    constructor() {
        this.generateQuests();
    }

    private generateQuests() {
        // 1. Tutorial Quest
        this.activeQuests.push({
            id: 'tutorial_pour',
            title: 'Khởi Động',
            description: 'Đổ Nước Cất (H2O) vào một Cốc thí nghiệm (Beaker).',
            isCompleted: false,
            checkCondition: (containers) => containers.some(c =>
                c.type === 'beaker' && c.contents && c.contents.chemicalId === 'H2O' && c.contents.volume > 0.1
            ),
            rewardMessage: "Khởi đầu tốt! Bây giờ hãy thử các phản ứng phức tạp hơn."
        });

        // 2. Dynamic Synthesis Quests (Pick random reactions from Registry)
        // Filter interesting reactions
        const safeReactions = REACTION_REGISTRY.filter(r => r.effect !== 'explosion' && r.product !== 'H2O');
        const dangerousReactions = REACTION_REGISTRY.filter(r => r.effect === 'explosion');

        // Pick 2 Safe
        const pickedSafe = safeReactions.sort(() => 0.5 - Math.random()).slice(0, 2);
        pickedSafe.forEach(r => {
            this.activeQuests.push({
                id: `syn_${r.product}_${Date.now()}_${Math.random()}`,
                title: `Tổng hợp ${formatName(r.product)}`,
                description: `Tạo ra ${formatName(r.product)} từ ${formatName(r.reactants[0])} và ${formatName(r.reactants[1])}.`,
                isCompleted: false,
                checkCondition: (containers) => containers.some(c => c.contents?.chemicalId === r.product),
                rewardMessage: `Tuyệt vời! Bạn đã tổng hợp thành công ${formatName(r.product)}.`
            });
        });

        // 3. Safety/Danger Quest (Optional)
        if (dangerousReactions.length > 0) {
            const r = dangerousReactions[0];
            // Instead of asking to explode, ask to Neutralize? Or observe carefully.
            // Let's ask to perform a specific showstopper reaction like Golden Rain if available
            const goldenRain = REACTION_REGISTRY.find(x => x.product === 'GOLDEN_RAIN');
            if (goldenRain) {
                this.activeQuests.push({
                    id: 'quest_golden_rain',
                    title: 'Thí Nghiệm: Mưa Vàng',
                    description: 'Tạo kết tủa PbI2 lấp lánh từ Chì Nitrat và Kali Iodua.',
                    isCompleted: false,
                    checkCondition: (containers) => containers.some(c => c.contents?.chemicalId === 'GOLDEN_RAIN'),
                    rewardMessage: "Một kiệt tác hóa học! Phản ứng trao đổi tạo ra kết tủa vàng óng."
                });
            }
        }
    }

    check(containers: ContainerState[], lastReaction: string | null) {
        let changed = false;
        this.activeQuests.forEach(quest => {
            if (!quest.isCompleted && quest.checkCondition(containers, lastReaction)) {
                quest.isCompleted = true;
                changed = true;
                if (this.onQuestComplete) this.onQuestComplete(quest);
            }
        });
        return changed;
    }

    getQuests() {
        return this.activeQuests;
    }
}
