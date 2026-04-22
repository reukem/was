// src/data/offlineKnowledge.ts

export interface OfflineResponse {
  keywords: string[];
  response: {
    VN: string;
    EN: string;
  };
}

export const OFFLINE_DATABANK: OfflineResponse[] = [
  // 1. ALKALI METALS + WATER (EXTREME DANGER)
  {
    keywords: ['na', 'sodium', 'natri', 'k', 'potassium', 'kali', 'nước', 'water', 'h2o'],
    response: {
      VN: "🚨 CẢNH BÁO NGUY HIỂM: Kim loại kiềm (Na, K) phản ứng cực kỳ mãnh liệt với nước! Phản ứng này tỏa nhiệt rất lớn, làm nóng chảy kim loại và bốc cháy khí Hiđrô (H2) vừa sinh ra, gây nổ bùm! 💥 Dung dịch sau phản ứng là bazơ mạnh. Bạn có biết trong thực tế, người ta bảo quản Natri bằng cách ngâm nó vào chất lỏng nào không? ^^",
      EN: "🚨 DANGER WARNING: Alkali metals (Na, K) react violently with water! This highly exothermic reaction melts the metal and ignites the evolved Hydrogen (H2) gas, causing an explosion! 💥 The resulting solution is a strong base. Do you know what liquid chemists use to safely store Sodium in the real world? ^^"
    }
  },

  // 2. ACID DILUTION (SAFETY PROTOCOL)
  {
    keywords: ['h2so4', 'axit sunfuric', 'sulfuric', 'nước', 'water', 'pha loãng', 'dilute'],
    response: {
      VN: "🚨 QUY TẮC AN TOÀN SINH TỬ: Tuyệt đối không bao giờ đổ nước vào Axit Sunfuric (H2SO4) đặc! Phản ứng hydrat hóa tỏa nhiệt cực sốc, có thể làm nước sôi đột ngột và bắn axit phỏng da. Luôn phải đổ TỪ TỪ axit vào nước và khuấy đều. Theo bạn, tại sao sự chênh lệch khối lượng riêng lại làm cho việc đổ nước vào axit trở nên nguy hiểm đến vậy? 3:",
      EN: "🚨 CRITICAL SAFETY RULE: Never pour water into concentrated Sulfuric Acid (H2SO4)! The hydration reaction is highly exothermic, causing water to instantly boil and splatter corrosive acid everywhere. Always pour acid INTO water slowly. Why do you think the difference in density makes pouring water into acid so dangerous? 3:"
    }
  },

  // 3. ELEPHANT TOOTHPASTE (CATALYTIC DECOMPOSITION)
  {
    keywords: ['h2o2', 'oxy già', 'peroxide', 'ki', 'kali iodua', 'iodide'],
    response: {
      VN: "🌋 PHẢN ỨNG PHÂN HỦY: Khi bạn cho Kali Iodua (KI) vào Oxy Già (H2O2), KI đóng vai trò là chất xúc tác, làm H2O2 phân hủy cực nhanh thành nước và khí Ôxy (O2). Nếu có thêm chút xà phòng, nó sẽ tạo ra bọt khổng lồ gọi là 'Kem đánh răng con voi'! Bạn có nhớ chất xúc tác thay đổi tốc độ phản ứng nhưng bản thân nó có bị hao hụt sau phản ứng không? :3",
      EN: "🌋 DECOMPOSITION REACTION: Adding Potassium Iodide (KI) to Hydrogen Peroxide (H2O2) triggers rapid decomposition! KI acts as a catalyst, breaking H2O2 down into water and Oxygen (O2) gas. If we had soap, this would create the 'Elephant Toothpaste' foam! Does a catalyst get consumed during a chemical reaction, or does it remain unchanged? :3"
    }
  },

  // 4. PRECIPITATION (SILVER CHLORIDE)
  {
    keywords: ['agno3', 'bạc nitrat', 'silver nitrate', 'nacl', 'muối', 'salt', 'hcl', 'clorua', 'chloride'],
    response: {
      VN: "🧪 KẾT TỦA TRẮNG: Trộn Bạc Nitrat (AgNO3) với hợp chất có gốc Clorua (như NaCl hoặc HCl) sẽ tạo ra phản ứng trao đổi. Kết quả là tạo ra Bạc Clorua (AgCl) - một chất rắn màu trắng sữa không tan trong nước và chìm xuống đáy bình. Hiện tượng này thường dùng để nhận biết ion Halogen. Thử đoán xem AgCl sẽ đổi sang màu gì nếu bạn mang nó ra phơi nắng? 🦊",
      EN: "🧪 WHITE PRECIPITATE: Mixing Silver Nitrate (AgNO3) with a Chloride compound (like NaCl or HCl) causes a double displacement reaction. It forms Silver Chloride (AgCl) - a milky white solid that doesn't dissolve in water and sinks to the bottom. What color do you think this precipitate will turn if exposed to direct sunlight? 🦊"
    }
  },

  // 5. TOXIC GAS (BLEACH + ACID)
  {
    keywords: ['naclo', 'thuốc tẩy', 'bleach', 'hcl', 'axit', 'acid'],
    response: {
      VN: "🚨 CẢNH BÁO ĐỘC HẠI: Không bao giờ trộn Thuốc tẩy (NaClO) với Axit (như HCl hay Giấm)! Sự kết hợp này giải phóng khí Clo (Cl2) màu vàng lục. Đây là một loại khí cực độc có thể gây tổn thương phổi nghiêm trọng. Trong phòng thí nghiệm, chúng ta phải dùng tủ hút khí độc (Fume Hood) cho phản ứng này. Khí Clo nặng hơn hay nhẹ hơn không khí nhỉ? 3:",
      EN: "🚨 TOXIC HAZARD: Never mix Bleach (NaClO) with an Acid (like HCl or Vinegar)! This combination rapidly releases Chlorine gas (Cl2), a greenish-yellow gas that is highly toxic and causes severe respiratory damage. We must always use a Fume Hood for this! Do you think Chlorine gas is heavier or lighter than normal air? 3:"
    }
  },

  // 6. ACID-BASE NEUTRALIZATION
  {
    keywords: ['naoh', 'bazơ', 'base', 'hcl', 'axit', 'acid', 'trung hòa', 'neutralization'],
    response: {
      VN: "⚖️ PHẢN ỨNG TRUNG HÒA: Khi trộn một axit mạnh (HCl) với một bazơ mạnh (NaOH), chúng sẽ 'triệt tiêu' lẫn nhau để tạo ra Muối Ăn (NaCl) và Nước (H2O). Phản ứng này tỏa nhiệt làm bình ấm lên đó! Nếu dùng chất chỉ thị Phenolphthalein, màu hồng của dung dịch NaOH sẽ biến mất khi bị trung hòa. Bạn có biết pH của dung dịch sau phản ứng hoàn toàn là bao nhiêu không? ^^",
      EN: "⚖️ NEUTRALIZATION: Mixing a strong acid (HCl) and a strong base (NaOH) causes them to cancel each other out, forming Table Salt (NaCl) and Water (H2O). This reaction is exothermic! If you used Phenolphthalein, the pink color of the base would vanish as it neutralizes. What is the final pH of a perfectly neutralized solution? ^^"
    }
  },

  // 7. THE HYDROGEN EXPLOSION
  {
    keywords: ['h2', 'hiđrô', 'hydrogen', 'o2', 'ôxy', 'oxygen', 'cháy', 'burn', 'nổ', 'explosion'],
    response: {
      VN: "🚨 CẢNH BÁO CHÁY NỔ: Trộn khí Hiđrô (H2) và Ôxy (O2) tạo ra hỗn hợp 'khí nổ' cực kỳ nguy hiểm. Chỉ cần một tia lửa nhỏ, phản ứng tỏa nhiệt dữ dội sẽ xảy ra, giải phóng năng lượng lớn và tạo ra hơi nước (H2O). Bạn có biết hỗn hợp này nổ mạnh nhất khi trộn theo tỉ lệ thể tích H2:O2 là bao nhiêu không? (Gợi ý: Nhìn vào công thức của nước nhé!) 🦊",
      EN: "🚨 EXPLOSION WARNING: Mixing Hydrogen (H2) and Oxygen (O2) creates a highly volatile gas mixture. A single spark triggers a violent exothermic reaction, releasing massive energy and forming water vapor (H2O). What volume ratio of H2 to O2 do you think creates the loudest, most powerful explosion? (Hint: Look at the formula for water!) 🦊"
    }
  },

  // 8. CATCH-ALL (GRACEFUL FALLBACK)
  {
    keywords: [], // Empty array means this is the fallback!
    response: {
      VN: "Hệ thống AI Đám mây hiện đang tạm ngắt kết nối nên mình chỉ truy cập được dữ liệu an toàn cốt lõi thôi! 😅 Bạn cứ tiếp tục ghép nối các hóa chất trong danh sách nhé, hệ thống vật lý vẫn chạy mượt mà 100%! Nhớ đeo kính bảo hộ nha! 🦊",
      EN: "My connection to the Cloud AI is currently offline, so I'm running on my Core Safety Matrix! 😅 Keep dragging and dropping the chemicals from your inventory—the physics engine is still running at 100%! Don't forget your safety goggles! 🦊"
    }
  }
];
