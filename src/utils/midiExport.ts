// @ts-ignore
import MidiWriter from 'midi-writer-js';

export interface RecordedNote {
  pitchMidi: number;
  startTimeSeconds: number;
  durationSeconds: number;
  velocity: number;
}

/**
 * Converts recorded note events into a downloadable MIDI file.
 */
export const exportToMidi = (notes: RecordedNote[], bpm: number = 120) => {
  if (notes.length === 0) return;

  // @ts-ignore
  const track = new MidiWriter.Track();
  track.setTempo(bpm);
  // @ts-ignore
  track.addEvent(new MidiWriter.ProgramChangeEvent({ instrument: 1 })); // Grand Piano

  // Sort notes by start time
  const sortedNotes = [...notes].sort((a, b) => a.startTimeSeconds - b.startTimeSeconds);

  // We need to handle overlapping notes and durations
  const ticksPerSecond = (bpm / 60) * 128; 

  sortedNotes.forEach((note) => {
    const startTick = Math.round(note.startTimeSeconds * ticksPerSecond);
    const durationTick = Math.round(note.durationSeconds * ticksPerSecond);

    track.addEvent(
      // @ts-ignore
      new MidiWriter.NoteEvent({
        pitch: [note.pitchMidi],
        duration: `t${durationTick}`, // 't' prefix means ticks
        startTick: startTick,
        velocity: Math.round(note.velocity * 100),
      })
    );
  });

  // @ts-ignore
  const writer = new MidiWriter.Writer(track);
  const blob = new Blob([writer.buildFile()], { type: 'audio/midi' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `recording-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.mid`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
