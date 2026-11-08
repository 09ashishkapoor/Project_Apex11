/**
 * Chant audio. One reusable element, swapped per deity.
 *
 * Autoplay policy: `play()` is only ever called from a user gesture (the start
 * pill, or a resume tap), which is what browsers require. Looping is handled by
 * the element itself so auto modes do not need to re-acquire playback
 * permission after every chant — the same problem the Flutter web build solved
 * with native media looping.
 */
export class ChantAudio {
  private readonly el: HTMLAudioElement;
  private currentSrc: string | null = null;
  private durationListeners = new Set<(duration: number) => void>();
  private endedListeners = new Set<() => void>();

  constructor() {
    this.el = new Audio();
    this.el.preload = 'auto';
    this.el.addEventListener('loadedmetadata', () => {
      this.emitDuration();
    });
    this.el.addEventListener('durationchange', () => {
      this.emitDuration();
    });
    this.el.addEventListener('ended', () => {
      for (const listener of this.endedListeners) listener();
    });
  }

  get duration(): number {
    const value = this.el.duration;
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  get playing(): boolean {
    return !this.el.paused && !this.el.ended && this.el.currentTime > 0;
  }

  onDuration(listener: (duration: number) => void): () => void {
    this.durationListeners.add(listener);
    return () => this.durationListeners.delete(listener);
  }

  onEnded(listener: () => void): () => void {
    this.endedListeners.add(listener);
    return () => this.endedListeners.delete(listener);
  }

  async play(src: string, options: { loop: boolean }): Promise<void> {
    if (this.currentSrc !== src) {
      this.currentSrc = src;
      this.el.src = src;
      this.el.load();
    }
    this.el.loop = options.loop;
    try {
      await this.el.play();
    } catch (error) {
      // A rejected play() means no gesture yet, or the file is missing.
      this.currentSrc = null;
      throw error;
    }
  }

  /**
   * Unlock the element from inside a user gesture. Call this synchronously,
   * before any `await`.
   *
   * Browsers only grant playback permission from within the gesture itself.
   * Starting a sitting writes to IndexedDB first, so the real `play()` happens
   * several tasks later — outside the gesture — and Safari and strict browsers
   * reject it outright with NotAllowedError. Playing muted for an instant during
   * the tap stamps that permission onto the element for the rest of the sitting.
   */
  prime(src: string): void {
    try {
      if (this.currentSrc !== src) {
        this.currentSrc = src;
        this.el.src = src;
        this.el.load();
      }
      this.el.muted = true;
      const started = this.el.play();
      this.el.pause();
      try {
        this.el.currentTime = 0;
      } catch {
        /* seek can throw before metadata is ready; harmless */
      }
      this.el.muted = false;
      // Pausing mid-start rejects the promise with AbortError; that is expected.
      void started.catch(() => {});
    } catch {
      /* if priming fails the later play() reports the real problem */
    }
  }

  pause(): void {
    this.el.pause();
  }

  stop(): void {
    this.el.pause();
    try {
      this.el.currentTime = 0;
    } catch {
      /* seek can throw before metadata is ready; harmless */
    }
  }

  /** Re-arm the element for a fresh single chant. */
  async replay(src: string): Promise<void> {
    if (this.currentSrc !== src) {
      await this.play(src, { loop: false });
      return;
    }
    this.el.loop = false;
    try {
      this.el.currentTime = 0;
    } catch {
      /* seek can throw before metadata is ready; harmless */
    }
    try {
      await this.el.play();
    } catch (error) {
      // A tap that lands while the previous chant is still starting aborts the
      // earlier play(); that is expected and harmless. Anything else (blocked
      // playback, decode failure) is real and must reach the caller, or the
      // chant is silently lost.
      if ((error as DOMException | undefined)?.name === 'AbortError') return;
      this.currentSrc = null;
      throw error;
    }
  }

  dispose(): void {
    this.stop();
    this.el.removeAttribute('src');
    this.el.load();
    this.durationListeners.clear();
    this.endedListeners.clear();
  }

  private emitDuration(): void {
    const value = this.duration;
    if (value > 0) {
      for (const listener of this.durationListeners) listener(value);
    }
  }
}
