export class AudioService {
    static async generateSpeech(text: string, lang: 'EN' | 'VN'): Promise<string | null> {
        if (localStorage.getItem('lucy_is_muted') === 'true') {
            console.log("AudioService: Muted. Speech synthesis aborted.");
            return null;
        }

        const apiKey = localStorage.getItem('elevenlabs_api_key');

        if (apiKey) {
            // Selected professional female voices for Lucy (Demo IDs from ElevenLabs defaults, can be changed by user)
            // 'Rachel' (21m00Tcm4TlvDq8ikWAM) for English
            // We will use a generic default for Vietnamese if a specific one isn't explicitly known to be perfect for VTuber aesthetics,
            // ElevenLabs Multilingual v2 supports Vietnamese automatically with the same voice ID.
            // Let's use 'Elli' (MF3mGyEYCl7XYWbV9V6O) for VN as she has a high-pitched emotive tone.
            const voiceId = lang === 'EN' ? '21m00Tcm4TlvDq8ikWAM' : 'MF3mGyEYCl7XYWbV9V6O';

            const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Accept': 'audio/mpeg',
                        'Content-Type': 'application/json',
                        'xi-api-key': apiKey
                    },
                    body: JSON.stringify({
                        text: text,
                        model_id: "eleven_multilingual_v2", // Multilingual v2 is required for Vietnamese
                        voice_settings: {
                            stability: 0.5,
                            similarity_boost: 0.75,
                            style: lang === 'VN' ? 0.3 : 0.0, // Slight style exaggeration for VN VTuber aesthetic
                            use_speaker_boost: true
                        }
                    })
                });

                if (response.ok) {
                    const audioBlob = await response.blob();
                    const audioUrl = URL.createObjectURL(audioBlob);
                    return audioUrl;
                } else {
                    const errorData = await response.json().catch(() => ({}));
                    console.error("ElevenLabs API Error:", errorData);
                    console.warn("ElevenLabs failed, falling back to native TTS...");
                }
            } catch (error) {
                console.error("AudioService error:", error);
                console.warn("ElevenLabs failed, falling back to native TTS...");
            }
        }

        // Native window.speechSynthesis fallback
        if (!window.speechSynthesis) {
            console.warn("Native speech synthesis not supported in this browser.");
            return null;
        }

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);

        const setupVoiceAndSpeak = () => {
            const voices = window.speechSynthesis.getVoices();
            if (lang === 'EN') {
                utterance.lang = 'en-US';
                utterance.pitch = 1.3;
                utterance.rate = 1.05;
                const enVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Victoria') || v.name.includes('Google UK English Female')));
                if (enVoice) utterance.voice = enVoice;
            } else {
                utterance.lang = 'vi-VN';
                utterance.pitch = 1.25;
                utterance.rate = 1.0;
                const viVoice = voices.find(v => v.lang.includes('vi') && (v.name.includes('Linh') || v.name.includes('Google Tiếng Việt') || v.name.includes('HoaiMy') || v.name.includes('Mai')));
                if (viVoice) utterance.voice = viVoice;
                else {
                    const anyViVoice = voices.find(v => v.lang.includes('vi'));
                    if (anyViVoice) utterance.voice = anyViVoice;
                }
            }
            window.speechSynthesis.speak(utterance);
        };

        if (window.speechSynthesis.getVoices().length === 0) {
            window.speechSynthesis.onvoiceschanged = setupVoiceAndSpeak;
        } else {
            setupVoiceAndSpeak();
        }

        return null; // Return null as audio plays natively
    }
}
