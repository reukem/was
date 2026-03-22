const apiKey = process.env.GEMINI_API_KEY || 'no-key';

const payload = {
    systemInstruction: {
        parts: [{ text: "System: You are Professor Lucy, an intelligent, Gen-Z AI chemistry assistant and the user's virtual sister. Use emojis (:3, ^^). Answer general questions cleverly. For chemistry, analyze the stoichiometry based on the lab state." }]
    },
    contents: [
        {
            role: 'user',
            parts: [{ text: "Hello!" }]
        }
    ],
    generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.85
    }
};

fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
}).then(res => {
    console.log("Status:", res.status);
    return res.text();
}).then(text => console.log(text)).catch(console.error);
