import { Chemical, ReactionEntry } from './types';

export const HEATER_POSITION: [number, number, number] = [0, 0.11, 1.0]; // On table, slightly forward

export const CHEMICALS: Record<string, Chemical> = {
    // --- LIQUIDS ---
    'H2O': {
        id: 'H2O',
        name: 'Nước Cất',
        formula: 'H₂O',
        color: '#06b6d4',
        type: 'liquid',
        meshStyle: 'flask',
        ph: 7.0,
        density: 1.0,
        description: 'Dung môi vạn năng.'
    },
    'HCl': {
        id: 'HCl',
        name: 'Axit Clohidric',
        formula: 'HCl',
        color: '#fef08a',
        type: 'liquid',
        meshStyle: 'flask',
        ph: 1.0,
        density: 1.18,
        description: 'Axit khoáng mạnh.'
    },
    'HNO3': {
        id: 'HNO3',
        name: 'Axit Nitric',
        formula: 'HNO₃',
        color: '#fde68a',
        type: 'liquid',
        meshStyle: 'flask',
        ph: 1.0,
        density: 1.51,
        description: 'Axit khoáng ăn mòn mạnh.'
    },
    'H2SO4': {
        id: 'H2SO4',
        name: 'Axit Sulfuric',
        formula: 'H₂SO₄',
        color: '#fcd34d',
        type: 'liquid',
        meshStyle: 'flask',
        ph: 0.5,
        density: 1.83,
        description: 'Axit háo nước mạnh.'
    },
    'H3PO4': {
        id: 'H3PO4',
        name: 'Axit Photphoric',
        formula: 'H₃PO₄',
        color: '#fbbf24',
        type: 'liquid',
        meshStyle: 'flask',
        ph: 1.5,
        density: 1.88,
        description: 'Axit khoáng yếu.'
    },
    'NaOH': {
        id: 'NaOH',
        name: 'Natri Hydroxit',
        formula: 'NaOH',
        color: '#e2e8f0',
        type: 'liquid',
        meshStyle: 'flask',
        ph: 14.0,
        density: 1.5,
        description: 'Bazơ ăn da.'
    },
    'NH3': {
        id: 'NH3',
        name: 'Amoniac',
        formula: 'NH₃',
        color: '#bae6fd',
        type: 'liquid',
        meshStyle: 'flask',
        ph: 11.5,
        density: 0.73,
        description: 'Bazơ yếu có mùi khai.'
    },
    'VINEGAR': {
        id: 'VINEGAR',
        name: 'Axit Axetic',
        formula: 'CH₃COOH',
        color: '#f8fafc',
        type: 'liquid',
        meshStyle: 'flask',
        ph: 2.5,
        density: 1.05,
        description: 'Axit hữu cơ yếu (Giấm).'
    },
    'BLEACH': {
        id: 'BLEACH',
        name: 'Natri Hypoclorit',
        formula: 'NaClO',
        color: '#fde047',
        type: 'liquid',
        meshStyle: 'flask',
        ph: 12.5,
        density: 1.11,
        description: 'Chất tẩy rửa oxy hóa mạnh.'
    },
    'H2O2': {
        id: 'H2O2',
        name: 'Hydro Peroxit',
        formula: 'H₂O₂',
        color: '#e0f2fe',
        type: 'liquid',
        meshStyle: 'flask',
        ph: 4.5,
        density: 1.45,
        description: 'Chất oxy hóa mạnh (Oxy già).'
    },
    'AgNO3': {
        id: 'AgNO3',
        name: 'Bạc Nitrat',
        formula: 'AgNO₃',
        color: '#94a3b8',
        type: 'liquid',
        meshStyle: 'flask',
        ph: 6.0,
        density: 4.35,
        description: 'Hợp chất nhạy sáng.'
    },
    'PbNO3': {
        id: 'PbNO3',
        name: 'Chì(II) Nitrat',
        formula: 'Pb(NO₃)₂',
        color: '#f8fafc',
        type: 'liquid',
        meshStyle: 'flask',
        ph: 5.0,
        density: 4.53,
        description: 'Muối độc hại.'
    },
    'GLUCOSE': {
        id: 'GLUCOSE',
        name: 'Dung Dịch Glucose',
        formula: 'C₆H₁₂O₆(aq)',
        color: '#f8fafc',
        type: 'liquid',
        meshStyle: 'flask',
        ph: 7.0,
        density: 1.54,
        description: 'Dung dịch đường.'
    },
    'INDIGO_CARMINE': {
        id: 'INDIGO_CARMINE',
        name: 'Indigo Carmine',
        formula: 'C₁₆H₈N₂Na₂O₈S₂',
        color: '#3b82f6', // Blue
        type: 'liquid',
        meshStyle: 'flask',
        ph: 7.0,
        density: 1.0,
        description: 'Chất chỉ thị oxy hóa khử.'
    },
    'PHENOLPHTHALEIN': {
        id: 'PHENOLPHTHALEIN',
        name: 'Phenolphthalein',
        formula: 'C₂₀H₁₄O₄',
        color: '#f8fafc', // Clear in acid
        type: 'liquid',
        meshStyle: 'flask',
        ph: 7.0,
        density: 1.28,
        description: 'Chất chỉ thị pH. Chuyển hồng ở pH > 8.2.'
    },
    'PINK_INDICATOR': {
        id: 'PINK_INDICATOR',
        name: 'Dung dịch Bazơ (Có chỉ thị)',
        formula: 'Mix',
        color: '#db2777', // Pink 600
        type: 'liquid',
        meshStyle: 'flask',
        ph: 9.0,
        density: 1.0,
        description: 'Dung dịch bazơ đã chuyển màu hồng.'
    },

    // --- SOLIDS ---
    'SODIUM': {
        id: 'SODIUM',
        name: 'Natri',
        formula: 'Na',
        color: '#e5e7eb', // White/Grey
        type: 'solid',
        meshStyle: 'rock',
        ph: 12.0,
        density: 0.97,
        description: 'Kim loại kiềm mềm, phản ứng mạnh.'
    },
    'POTASSIUM': {
        id: 'POTASSIUM',
        name: 'Kali',
        formula: 'K',
        color: '#94a3b8',
        type: 'solid',
        meshStyle: 'rock',
        ph: 13.0,
        density: 0.86,
        description: 'Kim loại phản ứng rất mạnh.'
    },
    'MAGNESIUM': {
        id: 'MAGNESIUM',
        name: 'Magie',
        formula: 'Mg',
        color: '#e2e8f0',
        type: 'solid',
        meshStyle: 'rock',
        ph: 7.0,
        density: 1.74,
        description: 'Kim loại kiềm thổ nhẹ.'
    },
    'CALCIUM_CARBONATE': {
        id: 'CALCIUM_CARBONATE',
        name: 'Canxi Cacbonat',
        formula: 'CaCO₃',
        color: '#f5f5f4',
        type: 'solid',
        meshStyle: 'mound',
        ph: 9.0,
        density: 2.71,
        description: 'Đá vôi / Phấn.'
    },
    'SALT': {
        id: 'SALT',
        name: 'Natri Clorua',
        formula: 'NaCl',
        color: '#ffffff',
        type: 'solid',
        meshStyle: 'crystal',
        ph: 7.0,
        density: 2.16,
        description: 'Muối ăn thông thường.'
    },
    'BAKING_SODA': {
        id: 'BAKING_SODA',
        name: 'Natri Bicarbonat',
        formula: 'NaHCO₃',
        color: '#ffffff',
        type: 'solid',
        meshStyle: 'mound',
        ph: 8.3,
        density: 2.2,
        description: 'Bột nở (Baking soda).'
    },
    'COPPER': {
        id: 'COPPER',
        name: 'Đồng',
        formula: 'Cu',
        color: '#b45309',
        type: 'solid',
        meshStyle: 'rock',
        ph: 7.0,
        density: 8.96,
        description: 'Kim loại màu đỏ cam.'
    },
    'IRON': {
        id: 'IRON',
        name: 'Sắt',
        formula: 'Fe',
        color: '#57534e',
        type: 'solid',
        meshStyle: 'rock',
        ph: 7.0,
        density: 7.87,
        description: 'Kim loại có từ tính.'
    },
    'ZINC': {
        id: 'ZINC',
        name: 'Kẽm',
        formula: 'Zn',
        color: '#a1a1aa',
        type: 'solid',
        meshStyle: 'rock',
        ph: 7.0,
        density: 7.14,
        description: 'Kim loại màu trắng xanh.'
    },
    'ALUMINUM': {
        id: 'ALUMINUM',
        name: 'Nhôm',
        formula: 'Al',
        color: '#d1d5db',
        type: 'solid',
        meshStyle: 'rock',
        ph: 7.0,
        density: 2.70,
        description: 'Kim loại nhẹ màu trắng bạc.'
    },
    'Fe2O3': {
        id: 'Fe2O3',
        name: 'Sắt(III) Oxit',
        formula: 'Fe₂O₃',
        color: '#7f1d1d',
        type: 'solid',
        meshStyle: 'mound',
        ph: 7.0,
        density: 5.24,
        description: 'Gỉ sắt / Hematit.'
    },
    'KI': {
        id: 'KI',
        name: 'Kali Iodua',
        formula: 'KI',
        color: '#ffffff',
        type: 'solid',
        meshStyle: 'mound',
        ph: 7.0,
        density: 3.12,
        description: 'Muối iot xúc tác.'
    },
    'IODINE': {
        id: 'IODINE',
        name: 'I-ốt',
        formula: 'I₂',
        color: '#4c1d95',
        type: 'solid',
        meshStyle: 'crystal',
        ph: 5.5,
        density: 4.93,
        description: 'Phi kim màu tím đen lấp lánh.'
    },
    'KMnO4': {
        id: 'KMnO4',
        name: 'Kali Permanganat',
        formula: 'KMnO₄',
        color: '#701a75',
        type: 'solid',
        meshStyle: 'crystal',
        ph: 7.0,
        density: 2.70,
        description: 'Thuốc tím (Oxy hóa mạnh).'
    },
    'GOLD': {
        id: 'GOLD',
        name: 'Vàng',
        formula: 'Au',
        color: '#fbbf24', // Golden yellow
        type: 'solid',
        meshStyle: 'rock',
        ph: 7.0,
        density: 19.3,
        description: 'Kim loại quý.'
    },

    // --- GASES/OTHERS ---
    'CHLORINE': {
        id: 'CHLORINE',
        name: 'Khí Clo',
        formula: 'Cl₂',
        color: '#bef264',
        type: 'gas',
        meshStyle: 'canister',
        ph: 4.0,
        density: 0.003,
        description: 'Khí độc màu vàng lục.'
    },
    'COPPER_SULFATE': {
        id: 'COPPER_SULFATE',
        name: 'Đồng(II) Sunfat',
        formula: 'CuSO₄',
        color: '#3b82f6',
        type: 'solid',
        meshStyle: 'crystal',
        ph: 4.0,
        density: 3.6,
        description: 'Tinh thể màu xanh lam.'
    },
    'MOLTEN_IRON': {
        id: 'MOLTEN_IRON',
        name: 'Sắt Nóng Chảy',
        formula: 'Fe(l)',
        color: '#f59e0b',
        type: 'liquid',
        meshStyle: 'flask',
        ph: 7.0,
        density: 6.98,
        description: 'Sắt lỏng siêu nóng.'
    },
    'GOLDEN_RAIN': {
        id: 'GOLDEN_RAIN',
        name: 'Chì(II) Iodua',
        formula: 'PbI₂',
        color: '#facc15', // Bright Yellow
        type: 'solid',
        meshStyle: 'crystal',
        ph: 7.0,
        density: 6.16,
        description: 'Tinh thể lục giác vàng óng ánh.'
    },
    'TRAFFIC_RED': {
        id: 'TRAFFIC_RED',
        name: 'Đỏ trung gian',
        formula: 'Phức chất',
        color: '#ef4444',
        type: 'liquid',
        meshStyle: 'flask',
        ph: 10.0,
        density: 1.0,
        description: 'Trạng thái chuyển tiếp.'
    },
    'THERMITE_MIX': {
        id: 'THERMITE_MIX',
        name: 'Bột Nhiệt Nhôm',
        formula: 'Fe₂O₃ + 2Al',
        color: '#9ca3af', // Greyish
        type: 'solid',
        meshStyle: 'mound',
        ph: 7.0,
        density: 3.0,
        description: 'Hỗn hợp bột nhôm và oxit sắt. Cần nhiệt độ cao để kích hoạt.',
        thermalDecomposition: {
            product: 'MOLTEN_IRON',
            minTemperature: 500,
            effect: 'explosion',
            message: 'Phản ứng nhiệt nhôm! Fe₂O₃ + 2Al → 2Fe + Al₂O₃. Nhiệt độ cực cao tạo ra sắt nóng chảy.'
        }
    }
};

export const REACTION_REGISTRY: ReactionEntry[] = [
    {
        reactants: ['SODIUM', 'H2O'],
        product: 'NaOH',
        resultColor: '#f8fafc',
        effect: 'explosion',
        temperature: 550,
        message: 'Phản ứng tỏa nhiệt mạnh. 2Na + 2H₂O → 2NaOH + H₂. Khí hydro giãn nở nhanh gây nổ nhiệt.'
    },
    {
        reactants: ['POTASSIUM', 'H2O'],
        product: 'NaOH',
        resultColor: '#d8b4fe',
        effect: 'explosion',
        temperature: 700,
        message: 'Phản ứng dữ dội! 2K + 2H₂O → 2KOH + H₂. Kali cháy với ngọn lửa màu tím đặc trưng trước khi phát nổ.'
    },
    {
        reactants: ['MAGNESIUM', 'HCl'],
        product: 'H2O',
        resultColor: '#e2e8f0',
        effect: 'bubbles',
        temperature: 60,
        message: 'Phản ứng thế đơn giản. Mg + 2HCl → MgCl₂ + H₂. Sủi bọt khí Hydro mạnh.'
    },
    {
        reactants: ['COPPER', 'HNO3'],
        product: 'COPPER_SULFATE',
        resultColor: '#1e3a8a',
        effect: 'smoke',
        temperature: 80,
        duration: 3000,
        message: 'Phản ứng Oxi hóa - Khử. Cu + 4HNO₃ → Cu(NO₃)₂ + 2NO₂ + 2H₂O. Tạo ra khí Nitơ Đioxit màu nâu đỏ độc hại.'
    },
    {
        reactants: ['CALCIUM_CARBONATE', 'VINEGAR'],
        product: 'H2O',
        resultColor: '#f1f5f9',
        effect: 'bubbles',
        temperature: 20,
        message: 'Phản ứng Axit - Muối Cacbonat. CaCO₃ + 2CH₃COOH → Ca(CH₃COO)₂ + H₂O + CO₂. Sủi bọt khí CO₂.'
    },
    {
        reactants: ['CALCIUM_CARBONATE', 'HCl'],
        product: 'H2O',
        resultColor: '#e2e8f0',
        effect: 'foam',
        temperature: 30,
        message: 'Phân hủy mạnh. CaCO₃ + 2HCl → CaCl₂ + H₂O + CO₂. Sủi bọt dữ dội.'
    },
    {
        reactants: ['BAKING_SODA', 'VINEGAR'],
        product: 'H2O',
        resultColor: '#ffffff',
        effect: 'bubbles',
        temperature: 15,
        message: 'Trung hòa Axit - Bazơ. NaHCO₃ + CH₃COOH → CO₂ + H₂O + NaCH₃COO. Giải phóng khí CO₂.'
    },
    {
        reactants: ['BLEACH', 'VINEGAR'],
        product: 'CHLORINE',
        resultColor: '#bef264',
        effect: 'smoke',
        temperature: 45,
        message: 'CẢNH BÁO NGUY HIỂM: 2H⁺ + OCl⁻ + Cl⁻ → Cl₂ + H₂O. Phát hiện khí Clo độc hại.'
    },
    {
        reactants: ['HCl', 'NaOH'],
        product: 'SALT',
        resultColor: '#ffffff',
        effect: 'smoke',
        temperature: 95,
        message: 'Phản ứng trung hòa. HCl + NaOH → NaCl + H₂O. Tạo dung dịch muối và tỏa nhiệt lớn.'
    },
    {
        reactants: ['SODIUM', 'CHLORINE'],
        product: 'SALT',
        resultColor: '#ffffff',
        effect: 'fire',
        temperature: 800,
        message: 'Tổng hợp. 2Na + Cl₂ → 2NaCl. Phản ứng oxy hóa khử tạo muối ăn.'
    },
    {
        reactants: ['COPPER_SULFATE', 'NaOH'],
        product: 'H2O',
        resultColor: '#1e3a8a',
        effect: 'bubbles',
        temperature: 30,
        message: 'Kết tủa. CuSO₄ + 2NaOH → Cu(OH)₂ + Na₂SO₄. Tạo kết tủa Đồng(II) Hydroxit màu xanh lam.'
    },
    {
        reactants: ['H2O2', 'KI'],
        product: 'H2O',
        resultColor: '#fef3c7',
        effect: 'foam',
        temperature: 90,
        duration: 4000,
        message: 'Phân hủy xúc tác. 2H₂O₂ → 2H₂O + O₂. Phản ứng "Kem đánh răng voi".'
    },
    {
        reactants: ['Fe2O3', 'ALUMINUM'],
        product: 'THERMITE_MIX',
        resultColor: '#9ca3af',
        temperature: 25,
        message: 'Tạo thành hỗn hợp nhiệt nhôm. Cần đun nóng để kích hoạt phản ứng.'
    },
    {
        reactants: ['AgNO3', 'SALT'],
        product: 'H2O',
        resultColor: '#f8fafc',
        effect: 'smoke',
        temperature: 25,
        message: 'Kết tủa. AgNO₃ + NaCl → AgCl(s) + NaNO₃. Tạo kết tủa Bạc Clorua màu trắng.'
    },
    {
        reactants: ['ZINC', 'HCl'],
        product: 'H2O',
        resultColor: '#e2e8f0',
        effect: 'bubbles',
        temperature: 40,
        message: 'Phản ứng thế đơn giản. Zn + 2HCl → ZnCl₂ + H₂. Giải phóng khí Hydro.'
    },
    {
        reactants: ['IRON', 'H2SO4'],
        product: 'H2O',
        resultColor: '#bef264',
        effect: 'bubbles',
        temperature: 50,
        message: 'Oxy hóa khử. Fe + H₂SO₄ → FeSO₄ + H₂. Tạo thành Sắt(II) Sunfat và Hydro.'
    },
    {
        reactants: ['NH3', 'HCl'],
        product: 'H2O',
        resultColor: '#f1f5f9',
        effect: 'smoke',
        temperature: 30,
        message: 'Phản ứng pha khí. NH₃ + HCl → NH₄Cl. Tạo khói trắng Amoni Clorua.'
    },
    // --- SHOWSTOPPERS ---
    {
        reactants: ['PbNO3', 'KI'],
        product: 'GOLDEN_RAIN',
        resultColor: '#facc15', // Gold
        effect: 'sparkles',
        temperature: 30,
        duration: 5000, // Slow precipitation
        message: 'Mưa Vàng! Pb(NO₃)₂ + 2KI → PbI₂ + 2KNO₃. Kết tủa tinh thể Chì Iodua vàng óng tuyệt đẹp.'
    },
    {
        reactants: ['GLUCOSE', 'INDIGO_CARMINE'],
        product: 'TRAFFIC_RED',
        resultColor: '#ef4444', // Turns Red
        effect: 'bubbles',
        temperature: 25,
        duration: 4000,
        message: 'Đèn Giao Thông Hóa Học. Sự thay đổi trạng thái oxy hóa làm đổi màu từ Xanh sang Đỏ (và cuối cùng là Vàng).'
    }
];
