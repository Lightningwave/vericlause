/**
 * TTS helper with front-cutoff fix.
 *
 * Problem: The Web Speech API (SpeechSynthesis) often clips the first
 * ~200-300ms of audio when the output device is initialising (Bluetooth
 * headphones, USB DACs, etc.). This causes the first word to be cut off.
 *
 * Solution (two-pronged):
 *   1. Call `speechSynthesis.cancel()` before each utterance to flush the
 *      queue and reset internal state.
 *   2. Insert a 300ms programmatic delay between cancel() and speak() to
 *      give the audio subsystem time to re-initialise. This is more
 *      reliable than SSML `<break>` since Web Speech API support for SSML
 *      varies across browsers.
 *
 * Usage from a page component:
 *
 *   import { speakText } from "@/lib/speech/speakText";
 *
 *   speakText("Hello world", "en-SG");
 *   speakText("你好", "zh-CN", { rate: 0.9 });
 */

const TTS_STARTUP_DELAY_MS = 300;

export interface SpeakOptions {
  rate?: number;
  pitch?: number;
  voice?: SpeechSynthesisVoice | null;
}

/**
 * Speak text using the Web Speech API with front-cutoff mitigation.
 *
 * @param text  - The text to speak.
 * @param lang  - BCP-47 language tag (e.g. "en-SG", "zh-CN").
 * @param opts  - Optional rate, pitch, and voice overrides.
 * @returns A promise that resolves when the utterance ends (or rejects on error).
 */
export function speakText(
  text: string,
  lang: string,
  opts: SpeakOptions = {},
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve();
      return;
    }

    // Step 1: Cancel any pending/active speech to reset the synthesiser.
    window.speechSynthesis.cancel();

    // Step 2: Wait for the audio subsystem to settle before starting.
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = opts.rate ?? 1;
      utterance.pitch = opts.pitch ?? 1;

      if (opts.voice) {
        utterance.voice = opts.voice;
        utterance.lang = opts.voice.lang;
      }

      utterance.onend = () => resolve();
      utterance.onerror = (e) => {
        // "interrupted" and "canceled" are expected when cancel() is called
        if (e.error === "interrupted" || e.error === "canceled") {
          resolve();
        } else {
          reject(e);
        }
      };

      window.speechSynthesis.speak(utterance);
    }, TTS_STARTUP_DELAY_MS);
  });
}
