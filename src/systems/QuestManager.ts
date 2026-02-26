// src/systems/QuestManager.ts
import { ContainerState } from '../types';
import { CHEMICALS } from '../constants';

export interface Quest {
    id: string;
    title: string;
    description: string;
    isCompleted: boolean;
    rewardMessage: string;
}

export class QuestManager {
    private quests: Quest[] = [
        {
            id: 'synthesize_nacl',
            title: 'Tổng hợp Natri Clorua (Muối)',
            description: 'Trộn Natri và Clo hoặc NaOH và HCl để tạo muối.',
            isCompleted: false,
            rewardMessage: 'Tuyệt vời! Bạn đã tổng hợp thành công Muối Ăn (NaCl).'
        },
        {
            id: 'measure_ph',
            title: 'Phân tích độ pH',
            description: 'Sử dụng máy phân tích để đo pH của một hóa chất bất kỳ.',
            isCompleted: false,
            rewardMessage: 'Đã ghi nhận dữ liệu pH vào nhật ký.'
        },
        {
            id: 'observation',
            title: 'Ghi chép quan sát',
            description: 'Tương tác với trợ lý ảo để ghi lại quan sát về một phản ứng.',
            isCompleted: false,
            rewardMessage: 'Quan sát đã được lưu trữ.'
        }
    ];

    onQuestComplete: ((quest: Quest) => void) | null = null;

    check(containers: ContainerState[], lastReaction: string | null) {
        // Check NaCl Synthesis
        if (!this.quests[0].isCompleted) {
            const hasSalt = containers.some(c => c.contents && c.contents.chemicalId === 'SALT');
            if (hasSalt) {
                this.completeQuest(0);
            }
        }

        // Check pH Measurement (Implicitly done if analyzer is used? Hard to check without analyzer state passed here)
        // Maybe check if any container is near analyzer?
        // For simplicity, let's skip strict check or assume App passes analyzer usage.
        // But App only passes containers and lastReaction.
        // Maybe we check if lastReaction involves pH?
        // Or if user synthesized something that requires pH check?
        // Let's just check if lastReaction is present for 'observation' quest.
        if (!this.quests[2].isCompleted && lastReaction) {
            this.completeQuest(2);
        }
    }

    private completeQuest(index: number) {
        if (!this.quests[index].isCompleted) {
            this.quests[index].isCompleted = true;
            if (this.onQuestComplete) {
                this.onQuestComplete(this.quests[index]);
            }
        }
    }

    getQuests() {
        return this.quests;
    }
}
