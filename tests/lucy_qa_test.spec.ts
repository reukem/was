import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.setTimeout(400000);
test('Professor Lucy QA Test', async ({ page }) => {
    // 1. Navigate to the app
    await page.goto('http://localhost:3000');

    // 2. Inject API key into localStorage
    await page.evaluate(() => {
        localStorage.setItem('gemini_api_key', 'AIzaSyDcVVXGjSFSAYqFhbY4MxrSGq6dI-iFUBU');
    });

    // 3. Reload to apply the key
    await page.reload();

    // 4. Ensure we are loaded
    await page.waitForSelector('text=CHEMIC-AI', { timeout: 30000 });

    // 5. Expand chat if it's not already expanded
    // Actually, we can just find the input directly
    const inputLocator = page.locator('input[placeholder="Hỏi Lucy..."]');
    await inputLocator.waitFor({ state: 'visible', timeout: 10000 });

    const questions = [
        "Cô giải thích cho em nguyên lý cơ bản của nhiệt động lực học được không?",
        "Làm sao để tổng hợp Aspirin từ Axit Salicylic vậy cô?",
        "Cô ơi, cơ học lượng tử giải thích các orbital nguyên tử như thế nào?",
        "Em chưa hiểu rõ về phản ứng nhiệt nhôm, cô có thể giải thích chi tiết phương trình và ứng dụng của nó không?",
        "Sự khác biệt giữa liên kết ion và liên kết cộng hóa trị là gì hả cô?",
        "Cô chỉ em cách tính hằng số cân bằng Kp và Kc nha?",
        "Lý thuyết axit-bazơ của Brønsted-Lowry khác gì so với Arrhenius vậy cô?",
        "Chất xúc tác ảnh hưởng thế nào đến năng lượng hoạt hóa của một phản ứng, cô giải thích giúp em với?",
        "Cô ơi, hiện tượng đồng vị là gì và tại sao khối lượng nguyên tử trung bình lại là số thập phân?",
        "Cho em hỏi về quy tắc Markovnikov trong phản ứng cộng của anken với HX nha cô!"
    ];

    const outDir = path.join(process.cwd() + "/tests", 'qa_screenshots');
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }

    for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        console.log(`Asking question ${i + 1}: ${question}`);

        // Ensure input is interactable
        await inputLocator.fill(question);

        // Find send button and click, or hit enter
        await inputLocator.press('Enter');

        // Wait for the AI response. We can do this by waiting for a specific delay
        // since Gemini Pro might take 5-15 seconds. Let's wait for a new model message
        // to appear.
        // Let's identify the chat panel div
        const chatPanel = page.locator('.absolute.bottom-0.right-6');

        // Wait for a reasonable time for response generation
        // Gemini Pro is slow. Wait at least 15-20 seconds for the typing to finish.
        // We can detect when the loading state is over by checking if the input is re-enabled,
        // but it doesn't look like we disable the input during loading based on `App.tsx` memory.
        // Let's just wait 25 seconds to be safe.
        await page.waitForTimeout(25000);

        // Scroll chat to bottom (if not auto-scrolled)
        await page.evaluate(() => {
            const chatContainer = document.querySelector('.overflow-y-auto.custom-scrollbar');
            if (chatContainer) {
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }
        });

        // Small delay to ensure render
        await page.waitForTimeout(1000);

        // Take screenshot of the chat panel or full page
        await page.screenshot({ path: path.join(outDir, `qa_${i + 1}.png`) });
    }

    console.log('QA Test complete!');
});