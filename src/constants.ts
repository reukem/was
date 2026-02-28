import { Chemical, ReactionEntry } from './types';

export const CHEMICALS: Record<string, Chemical> = {
    'H2O': { id: 'H2O', name: 'Nước Cất', formula: 'H₂O', color: '#06b6d4', type: 'liquid', meshStyle: 'flask', ph: 7.0, description: 'Dung môi phổ quát.' },
    'SODIUM': { id: 'SODIUM', name: 'Natri', formula: 'Na', color: '#9ca3af', type: 'solid', meshStyle: 'rock', ph: 12.0, description: 'Kim loại kiềm mềm, phản ứng mạnh.' },
    'POTASSIUM': { id: 'POTASSIUM', name: 'Kali', formula: 'K', color: '#94a3b8', type: 'solid', meshStyle: 'rock', ph: 13.0, description: 'Kim loại rất hoạt động.' },
    'MAGNESIUM': { id: 'MAGNESIUM', name: 'Magiê', formula: 'Mg', color: '#e2e8f0', type: 'solid', meshStyle: 'rock', ph: 7.0, description: 'Kim loại kiềm thổ nhẹ.' },
    'COPPER': { id: 'COPPER', name: 'Đồng', formula: 'Cu', color: '#b45309', type: 'solid', meshStyle: 'rock', ph: 7.0, description: 'Kim loại dẻo màu đỏ cam.' },
    'CALCIUM_CARBONATE': { id: 'CALCIUM_CARBONATE', name: 'Canxi Cacbonat', formula: 'CaCO₃', color: '#f5f5f4', type: 'solid', meshStyle: 'mound', ph: 9.0, description: 'Chất phổ biến trong đá/vỏ sò.' },

    'CHLORINE': { id: 'CHLORINE', name: 'Khí Clo', formula: 'Cl₂', color: '#bef264', type: 'gas', meshStyle: 'canister', ph: 4.0, description: 'Khí nhị nguyên tử độc hại.' },
    'SALT': { id: 'SALT', name: 'Muối Ăn', formula: 'NaCl', color: '#ffffff', type: 'solid', meshStyle: 'mound', ph: 7.0, description: 'Natri Clorua tinh thể.' },

    'HCl': { id: 'HCl', name: 'Axit Clohydric', formula: 'HCl', color: '#fef08a', type: 'liquid', meshStyle: 'flask', ph: 1.0, description: 'Axit vô cơ mạnh.' },
    'HNO3': { id: 'HNO3', name: 'Axit Nitric', formula: 'HNO₃', color: '#fde68a', type: 'liquid', meshStyle: 'flask', ph: 1.0, description: 'Axit vô cơ ăn mòn cao.' },
    'NaOH': { id: 'NaOH', name: 'Natri Hydroxit', formula: 'NaOH', color: '#e2e8f0', type: 'liquid', meshStyle: 'flask', ph: 14.0, description: 'Bazơ kiềm ăn da.' },
    'VINEGAR': { id: 'VINEGAR', name: 'Giấm Ăn', formula: 'CH₃COOH', color: '#f8fafc', type: 'liquid', meshStyle: 'flask', ph: 2.5, description: 'Axit hữu cơ yếu.' },
    'BAKING_SODA': { id: 'BAKING_SODA', name: 'Bột Nở', formula: 'NaHCO₃', color: '#ffffff', type: 'solid', meshStyle: 'mound', ph: 8.3, description: 'Muối kiềm nhẹ.' },
    'BLEACH': { id: 'BLEACH', name: 'Thuốc Tẩy', formula: 'NaClO', color: '#fde047', type: 'liquid', meshStyle: 'flask', ph: 12.5, description: 'Chất oxy hóa mạnh.' },

    'COPPER_SULFATE': { id: 'COPPER_SULFATE', name: 'Đồng(II) Sunfat', formula: 'CuSO₄', color: '#3b82f6', type: 'solid', meshStyle: 'crystal', ph: 4.0, description: 'Hợp chất vô cơ màu xanh lam.' },
    'H2O2': { id: 'H2O2', name: 'Oxy Già', formula: 'H₂O₂', color: '#e0f2fe', type: 'liquid', meshStyle: 'flask', ph: 4.5, description: 'Chất oxy hóa mạnh.' },
    'KI': { id: 'KI', name: 'Kali Iodua', formula: 'KI', color: '#ffffff', type: 'solid', meshStyle: 'mound', ph: 7.0, description: 'Muối xúc tác tinh thể.' },
    'IODINE': { id: 'IODINE', name: 'Iốt', formula: 'I₂', color: '#4c1d95', type: 'solid', meshStyle: 'crystal', ph: 5.5, description: 'Phi kim màu tím đen lấp lánh.' },

    // PHASE 3 ADDITIONS
    'H2SO4': { id: 'H2SO4', name: 'Axit Sulfuric', formula: 'H₂SO₄', color: '#e2e8f0', type: 'liquid', meshStyle: 'flask', ph: 1.0, description: 'Axit vô cơ mạnh.' },
    'Mg': { id: 'Mg', name: 'Dây Magiê', formula: 'Mg', color: '#cbd5e1', type: 'solid', meshStyle: 'rock', ph: 7.0, description: 'Kim loại bạc sáng bóng, dễ cháy.' }, // Alias or alternate form of MAGNESIUM
    'CuSO4_LIQUID': { id: 'CuSO4_LIQUID', name: 'Dung dịch CuSO₄', formula: 'CuSO₄', color: '#3b82f6', type: 'liquid', meshStyle: 'flask', ph: 4.0, description: 'Dung dịch màu xanh lam đậm.' }, // Liquid form of COPPER_SULFATE
    'Ca': { id: 'Ca', name: 'Canxi', formula: 'Ca', color: '#94a3b8', type: 'solid', meshStyle: 'rock', ph: 7.0, description: 'Kim loại kiềm thổ màu xám xỉn.' },

    // Product Definitions
    'MgSO4': { id: 'MgSO4', name: 'Magiê Sunfat', formula: 'MgSO₄', color: '#e2e8f0', type: 'solid', meshStyle: 'mound', ph: 6.0, description: 'Muối vô cơ tan trong nước.' },
    'CaOH2': { id: 'CaOH2', name: 'Canxi Hydroxit', formula: 'Ca(OH)₂', color: '#f1f5f9', type: 'solid', meshStyle: 'mound', ph: 12.0, description: 'Dung dịch nước vôi trong/đục.' }
};

export const REACTION_REGISTRY: ReactionEntry[] = [
    { reactants: ['SODIUM', 'H2O'], product: 'NaOH', resultColor: '#f8fafc', effect: 'explosion', temperature: 550, message: 'Phản ứng tỏa nhiệt mạnh! Na + H₂O → NaOH + H₂. Sự giãn nở hydro gây nổ nhiệt.' },
    { reactants: ['POTASSIUM', 'H2O'], product: 'NaOH', resultColor: '#d8b4fe', effect: 'explosion', temperature: 700, message: 'Phản ứng dữ dội! 2K + 2H₂O → 2KOH + H₂. Kali cháy với ngọn lửa tím hoa cà trước khi nổ.' },
    { reactants: ['MAGNESIUM', 'HCl'], product: 'H2O', /* Simulating clear solution of MgCl2 */ resultColor: '#e2e8f0', effect: 'bubbles', temperature: 60, message: 'Phản ứng thế đơn. Mg + 2HCl → MgCl₂ + H₂. Sủi bọt khí Hydro nhanh chóng.' },
    { reactants: ['COPPER', 'HNO3'], product: 'COPPER_SULFATE', /* Using Cu salt color */ resultColor: '#1e3a8a', /* Deep Blue */ effect: 'smoke', temperature: 80, message: 'Phản ứng oxi hóa khử. Cu + 4HNO₃ → Cu(NO₃)₂ + 2NO₂ + 2H₂O. Sinh ra khí Nitơ đioxit nâu độc hại và Đồng Nitrat xanh lam.' },
    { reactants: ['CALCIUM_CARBONATE', 'VINEGAR'], product: 'H2O', resultColor: '#f1f5f9', effect: 'bubbles', temperature: 20, message: 'Phản ứng axit-cacbonat. CaCO₃ + 2CH₃COOH → Ca(CH₃COO)₂ + H₂O + CO₂. Sủi bọt khí CO2.' },
    { reactants: ['CALCIUM_CARBONATE', 'HCl'], product: 'H2O', resultColor: '#e2e8f0', effect: 'foam', temperature: 30, message: 'Phân hủy mạnh. CaCO₃ + 2HCl → CaCl₂ + H₂O + CO₂. Sủi bọt dữ dội.' },
    { reactants: ['BAKING_SODA', 'VINEGAR'], product: 'H2O', resultColor: '#ffffff', effect: 'bubbles', temperature: 15, message: 'Phản ứng trung hòa axit-bazơ. NaHCO₃ + CH₃COOH → CO₂ + H₂O + NaCH₃COO. Giải phóng CO2 sủi bọt.' },
    { reactants: ['BLEACH', 'VINEGAR'], product: 'CHLORINE', resultColor: '#bef264', effect: 'smoke', temperature: 45, message: 'CẢNH BÁO NGUY HIỂM: 2H⁺ + OCl⁻ + Cl⁻ → Cl₂ + H₂O. Phát hiện khí Clo độc hại.' },
    { reactants: ['HCl', 'NaOH'], product: 'SALT', resultColor: '#ffffff', effect: 'smoke', temperature: 95, message: 'Phản ứng trung hòa. HCl + NaOH → NaCl + H₂O. Tạo dung dịch muối và tỏa nhiệt mạnh.' },
    { reactants: ['SODIUM', 'CHLORINE'], product: 'SALT', resultColor: '#ffffff', effect: 'fire', temperature: 800, minTemp: 100, message: 'Phản ứng tổng hợp. 2Na + Cl₂ → 2NaCl. Phản ứng oxi hóa khử tạo muối ăn.' },
    { reactants: ['COPPER_SULFATE', 'NaOH'], product: 'H2O', resultColor: '#1e3a8a', effect: 'bubbles', temperature: 30, message: 'Phản ứng kết tủa. CuSO₄ + 2NaOH → Cu(OH)₂ + Na₂SO₄. Kết tủa xanh lam Đồng(II) Hydroxit hình thành.' },
    { reactants: ['H2O2', 'KI'], product: 'H2O', resultColor: '#fef3c7', effect: 'foam', temperature: 80, message: 'Phân hủy xúc tác. 2H₂O₂ → 2H₂O + O₂. Phản ứng "Kem đánh răng voi" tạo bọt oxy cực nhanh.' },

    // PHASE 3 REACTIONS
    { reactants: ['Mg', 'H2SO4'], product: 'MgSO4', resultColor: '#e2e8f0', effect: 'bubbles', temperature: 90, message: 'Phản ứng tỏa nhiệt mạnh! Mg + H₂SO₄ → MgSO₄ + H₂. Sủi bọt khí Hydro và dung dịch nóng lên nhanh chóng.' },
    { reactants: ['MAGNESIUM', 'H2SO4'], product: 'MgSO4', resultColor: '#e2e8f0', effect: 'bubbles', temperature: 90, message: 'Phản ứng tỏa nhiệt mạnh! Mg + H₂SO₄ → MgSO₄ + H₂. Sủi bọt khí Hydro và dung dịch nóng lên nhanh chóng.' }, // Supporting legacy ID
    { reactants: ['Ca', 'H2O'], product: 'CaOH2', resultColor: '#f1f5f9', effect: 'bubbles', temperature: 60, message: 'Phản ứng kiềm thổ với nước. Ca + 2H₂O → Ca(OH)₂ + H₂. Sủi bọt khí Hydro và tạo dung dịch Canxi Hydroxit đục.' }
];
