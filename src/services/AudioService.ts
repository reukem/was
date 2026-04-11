export class AudioService {
    static async generateSpeech(text: string, lang: 'EN' | 'VN'): Promise<string | null> {
        const apiKey = localStorage.getItem('elevenlabs_api_key');

        if (!apiKey) {
            console.warn("AudioService: No ElevenLabs API key provided. Speech synthesis aborted.");
            return null;
        }

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

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error("ElevenLabs API Error:", errorData);
                throw new Error(errorData.detail?.message || "ElevenLabs TTS synthesis failed.");
            }

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            return audioUrl;

        } catch (error) {
            console.error("AudioService error:", error);
            return null;
        }
    }
}
