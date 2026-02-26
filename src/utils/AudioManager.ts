// src/utils/AudioManager.ts
class AudioManager {
    private context: AudioContext | null = null;
    private gasSource: AudioBufferSourceNode | null = null;
    private gasGain: GainNode | null = null;

    constructor() {
        if (typeof window !== 'undefined') {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
                this.context = new AudioContextClass();
            }
        }
    }

    private playTone(freq: number, type: OscillatorType, duration: number, vol: number = 0.1) {
        if (!this.context) return;
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.context.currentTime);
        gain.gain.setValueAtTime(vol, this.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.context.destination);
        osc.start();
        osc.stop(this.context.currentTime + duration);
    }

    playSuccess() {
        if (!this.context) return;
        this.playTone(880, 'sine', 0.5);
        setTimeout(() => this.playTone(1100, 'sine', 0.5), 100);
    }

    playExplosion() {
        if (!this.context) return;
        this.playTone(100, 'sawtooth', 1.0, 0.5);
    }

    playFizz() {
        if (!this.context) return;
        const bufferSize = this.context.sampleRate * 0.5;
        const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = this.context.createBufferSource();
        noise.buffer = buffer;
        const gain = this.context.createGain();
        gain.gain.setValueAtTime(0.1, this.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.5);
        noise.connect(gain);
        gain.connect(this.context.destination);
        noise.start();
    }

    playGasHiss() {
        if (!this.context) return;
        if (this.gasSource) return;

        const bufferSize = this.context.sampleRate * 2;
        const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.context.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        const gain = this.context.createGain();
        gain.gain.setValueAtTime(0.05, this.context.currentTime);

        noise.connect(gain);
        gain.connect(this.context.destination);
        noise.start();

        this.gasSource = noise;
        this.gasGain = gain;
    }

    stopGasHiss() {
        if (this.gasSource) {
            this.gasSource.stop();
            this.gasSource = null;
        }
    }

    playGlassClink() {
        if (!this.context) return;
        this.playTone(2000, 'sine', 0.1, 0.05);
    }
}

export const audioManager = new AudioManager();
