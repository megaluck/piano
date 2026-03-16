import { Chord, Note } from 'tonal';

/**
 * Converts a MIDI number to a standard note name (e.g., 60 -> "C4")
 */
export function midiToNoteName(midi: number): string {
  return Note.fromMidi(midi);
}

/**
 * Detects the chord name from a list of active notes.
 */
export function detectChord(noteNames: string[]): string {
  if (noteNames.length === 0) return '';
  
  const chords = Chord.detect(noteNames);
  if (chords.length > 0) {
    return chords[0];
  }
  
  // If no exact chord is detected, return the first note as a fallback
  return noteNames[0];
}

/**
 * Formats a pitch MIDI number to a frequency (Hz).
 */
export function midiToFreq(midi: number): number {
  return Note.freq(Note.fromMidi(midi)) || 0;
}

/**
 * Translates English note names to Solfege (European) system.
 * Example: C -> Do, D -> Re, Eb -> Mib, F# Major -> Fa# Major
 */
export function toSolfege(input: string): string {
  if (!input) return '';

  const SOLFEGE_MAP: Record<string, string> = {
    'C': 'Do',
    'D': 'Re',
    'E': 'Mi',
    'F': 'Fa',
    'G': 'Sol',
    'A': 'La',
    'B': 'Si'
  };

  // Regular expression to find A-G notes, followed by optional accidentals
  // We use a positive lookahead for a boundary or a digit or a space to avoid partial matches
  return input.replace(/([A-G])([#b]*)/g, (_match, note, accidental) => {
    return (SOLFEGE_MAP[note] || note) + (accidental || '');
  });
}
