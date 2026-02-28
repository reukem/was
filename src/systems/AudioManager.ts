import { Howl, Howler } from 'howler';
import { Vector3 } from 'three';

type Vector3Like = Vector3 | [number, number, number];

export class AudioManager {
  private static instance: AudioManager;
  private sounds: Map<string, Howl> = new Map();
  private activeLoops: Map<string, number> = new Map();

  // Dummy URLs as requested
  private readonly ASSET_MAP: Record<string, string> = {
    // UI
    'ui_panel_expand': 'assets/audio/ui_panel_expand.mp3',
    'ui_panel_collapse': 'assets/audio/ui_panel_collapse.mp3',
    'ui_spawn': 'assets/audio/ui_spawn.mp3',
    // Interactions
    'glass_drag': 'assets/audio/glass_drag.mp3',
    'glass_drop': 'assets/audio/glass_drop.mp3',
    'liquid_pour': 'assets/audio/liquid_pour.mp3',
    // Reactions
    'liquid_boil': 'assets/audio/liquid_boil.mp3',
    'gas_hiss': 'assets/audio/gas_hiss.mp3',
    'explosion': 'assets/audio/placeholder_sodium_boom.mp3',
  };

  private constructor() {
    this.initializeFromStorage();
    this.preloadSounds();
  }

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  private initializeFromStorage() {
    const savedVolume = localStorage.getItem('chemic_ai_volume');
    const savedMuted = localStorage.getItem('chemic_ai_muted');

    if (savedVolume !== null) {
      Howler.volume(parseFloat(savedVolume));
    } else {
      Howler.volume(0.5); // Default volume
    }

    if (savedMuted === 'true') {
      Howler.mute(true);
    } else {
      Howler.mute(false);
    }
  }

  private preloadSounds() {
    for (const [key, url] of Object.entries(this.ASSET_MAP)) {
      const isLoop = key === 'liquid_boil' || key === 'gas_hiss';
      this.sounds.set(key, new Howl({
        src: [url],
        loop: isLoop,
        preload: true,
        onloaderror: () => {
          console.warn(`[Audio Engine] Missing asset: ${url}`);
        }
      }));
    }
  }

  public setVolume(volume: number) {
    Howler.volume(volume);
    localStorage.setItem('chemic_ai_volume', volume.toString());
  }

  public setMuted(muted: boolean) {
    Howler.mute(muted);
    localStorage.setItem('chemic_ai_muted', muted.toString());
  }

  public getVolume(): number {
    return Howler.volume();
  }

  public getMuted(): boolean {
    // There is no public getter for mute in Howler globally,
    // so we rely on localStorage as truth or default to false.
    return localStorage.getItem('chemic_ai_muted') === 'true';
  }

  // 2D sounds (UI)
  public playSound(soundId: string) {
    const sound = this.sounds.get(soundId);
    if (sound) {
      sound.play();
    } else {
      console.warn(`[Audio Engine] Sound not found: ${soundId}`);
    }
  }

  // 3D sounds (Environment)
  public playSound3D(soundId: string, position: Vector3Like, id?: string) {
    const sound = this.sounds.get(soundId);
    if (!sound) {
      console.warn(`[Audio Engine] Sound not found: ${soundId}`);
      return;
    }

    const posArray = position instanceof Vector3
      ? [position.x, position.y, position.z]
      : position;

    const playId = sound.play();
    sound.pos(posArray[0], posArray[1], posArray[2], playId);

    // Track looping sounds
    if (sound.loop() && id) {
      // If a loop for this ID already exists, fade and stop the old one first
      if (this.activeLoops.has(id)) {
        this.stopLoop(soundId, id);
      }
      this.activeLoops.set(id, playId);
    }
  }

  public updateLoopPosition(soundId: string, id: string, position: Vector3Like) {
    const sound = this.sounds.get(soundId);
    const playId = this.activeLoops.get(id);

    if (sound && playId !== undefined) {
      const posArray = position instanceof Vector3
        ? [position.x, position.y, position.z]
        : position;
      sound.pos(posArray[0], posArray[1], posArray[2], playId);
    }
  }

  public stopLoop(soundId: string, id: string, fadeDuration: number = 500) {
    const sound = this.sounds.get(soundId);
    const playId = this.activeLoops.get(id);

    if (sound && playId !== undefined) {
      const currentVol = sound.volume(playId) as number;
      sound.fade(currentVol, 0, fadeDuration, playId);

      // Stop completely after fade to free up resources
      setTimeout(() => {
        sound.stop(playId);
      }, fadeDuration);

      this.activeLoops.delete(id);
    }
  }
}
