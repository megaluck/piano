import { Note } from 'tonal';

/**
 * Plays a simple synthesized piano-like sound using Web Audio API.
 * Returns a function to stop the sound (simulating releasing the key).
 * @param midi The MIDI note number to play.
 * @param audioContext The AudioContext to use for synthesis.
 */
export const playPianoSound = (midi: number, audioContext: AudioContext): (() => void) => {
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  const freq = Note.freq(Note.fromMidi(midi));
  if (!freq) return () => {};

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  // Mix of triangle and sine to get a "softer" piano-like tone
  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);

  // Volume envelope (Attack)
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  // Attack: quick volume up to 0.4
  gainNode.gain.linearRampToValueAtTime(0.4, audioContext.currentTime + 0.02);
  // Decay: slight drop to sustain level
  gainNode.gain.exponentialRampToValueAtTime(0.3, audioContext.currentTime + 0.1);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start();

  // Return the stop function (Release)
  return () => {
    // Smooth release over 0.3 seconds to prevent clicking
    gainNode.gain.cancelScheduledValues(audioContext.currentTime);
    gainNode.gain.setValueAtTime(gainNode.gain.value, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.3);
    oscillator.stop(audioContext.currentTime + 0.3);
  };
};
