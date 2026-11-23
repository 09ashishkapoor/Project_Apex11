/**
 * Chant audio. One reusable element, swapped per deity.
 *
 * Autoplay policy: `play()` is only ever called from a user gesture (the start
 * pill, or a resume tap), which is what browsers require. Looping is handled by
 * the element itself so auto modes do not need to re-acquire playback
 * permission after every chant — the same problem the Flutter web build solved
 * with native media looping.
 *
 * A looped element is also the loop modes' clock. The clip's measured duration
 * is *not* how long a looping element really takes to repeat — browsers re-seek
 * to the start at every loop, and that seam adds time. So the wrapper watches
 * `currentTime` and reports each real wrap; the app counts those instead of
 * dividing the sitting clock by the clip length. See `onLoop`.
 */

/** A jump smaller than this when time moves "backwards" is a seek, not a loop. */
const LOOP_WRAP_S = 0.05;

export class ChantAudio {
  private readonly el: HTMLAudioElement;
  private currentSrc: string | null = null;
  private durationListeners = new Set<(duration: number) => void>();
  private endedListeners = new Set<() => void>();
  private loopListeners = new Set<() => void>();
  /** Last `currentTime` seen while looping, used to detect the wrap. */
  private lastTime = 0;

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
    this.el.addEventListener('timeupdate', () => this.trackLoop());
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

  /**
   * One loop of the clip has finished and playback has gone back to the start:
   * the devotee has heard exactly one more chant.
   *
   * Only fires for a looping element that is actually playing, and never for a
   * programmatic seek (`prime`, `stop`, `replay` reset the tracker), so a count
   * built on this can never run ahead of the chant.
   */
  onLoop(listener: () => void): () => void {
    this.loopListeners.add(listener);
    return () => this.loopListeners.delete(listener);
  }

  async play(src: string, options: { loop: boolean }): Promise<void> {
    if (this.currentSrc !== src) {
      this.currentSrc = src;
      this.el.src = src;
      this.el.load();
      this.resetLoopTracking();
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
      this.resetLoopTracking();
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
    this.resetLoopTracking();
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
    this.resetLoopTracking();
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
    this.loopListeners.clear();
  }

  /**
   * Detect a real loop boundary from the element's own clock.
   *
   * `currentTime` only moves backwards when the clip has reached its end and
   * started again, so a backwards step is one completed chant. The element must
   * still be looping and playing; a paused element owns the position and a
   * programmatic seek resets the tracker before any `timeupdate` can be read.
   */
  private trackLoop(): void {
    const current = this.el.currentTime;
    if (this.el.loop && !this.el.paused && current + LOOP_WRAP_S < this.lastTime) {
      this.lastTime = current;
      for (const listener of this.loopListeners) listener();
      return;
    }
    this.lastTime = current;
  }

  /** A deliberate seek is about to happen: do not read it as a completed chant. */
  private resetLoopTracking(): void {
    this.lastTime = 0;
  }

  private emitDuration(): void {
    const value = this.duration;
    if (value > 0) {
      for (const listener of this.durationListeners) listener(value);
    }
  }
}
