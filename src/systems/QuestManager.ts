import { ContainerState, Quest } from '../types';

export const QUESTS: Quest[] = [
    {
        id: 'orientation_pour',
        title: 'Thao Tác Cơ Bản',
        description: 'Đổ Nước Cất vào Cốc thủy tinh (Beaker). (Chuột phải + Giữ để rót)',
        checkCondition: (containers, _) => {
            // Find a beaker with water
            return containers.some(c =>
                c.type === 'beaker' &&
                c.contents &&
                c.contents.chemicalId === 'H2O' &&
                c.contents.volume > 0.1
            );
        },
        isCompleted: false,
        rewardMessage: "Tuyệt vời. Bạn đã thành thạo kỹ thuật chuyển chất lỏng."
    },
    {
        id: 'safety_neutralize',
        title: 'Quy Tắc An Toàn',
        description: 'Trung hòa Axit Clohidric (HCl) bằng Natri Hydroxit (NaOH).',
        checkCondition: (_, lastReaction) => {
            return lastReaction?.includes('NaCl') || false; // Checked against translated reaction message
        },
        isCompleted: false,
        rewardMessage: "Quy tắc an toàn đã được tuân thủ. Axit đã được trung hòa."
    },
    {
        id: 'discovery_golden_rain',
        title: 'Mưa Vàng',
        description: 'Tổng hợp tinh thể Chì Iodua (PbNO3 + KI).',
        checkCondition: (containers, _) => {
            return containers.some(c => c.contents?.chemicalId === 'GOLDEN_RAIN');
        },
        isCompleted: false,
        rewardMessage: "Kết tủa ngoạn mục! Bạn đã tạo ra cơn Mưa Vàng."
    }
];

export class QuestManager {
    private activeQuests: Quest[];
    public onQuestComplete: ((quest: Quest) => void) | null = null;

    constructor() {
        // Deep copy needed to reset state on new game, but simple spread is shallow.
        // For boolean toggle it's fine if we don't persist between sessions without reload.
        // Actually, we should map to new objects.
        this.activeQuests = QUESTS.map(q => ({...q}));
    }

    check(containers: ContainerState[], lastReaction: string | null) {
        this.activeQuests.forEach(quest => {
            if (!quest.isCompleted && quest.checkCondition(containers, lastReaction)) {
                quest.isCompleted = true;
                if (this.onQuestComplete) this.onQuestComplete(quest);
            }
        });
    }

    getQuests() {
        return this.activeQuests;
    }
}
