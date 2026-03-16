import React, { useMemo } from 'react';

interface PianoKeyboardProps {
  activeNotes: string[];
  onNoteStart?: (midi: number) => void;
  onNoteStop?: (midi: number) => void;
}

const PianoKeyboard: React.FC<PianoKeyboardProps> = ({ activeNotes, onNoteStart, onNoteStop }) => {
  const keys = useMemo(() => {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const result = [];
    for (let i = 21; i <= 108; i++) {
      const octave = Math.floor(i / 12) - 1;
      const noteName = notes[i % 12];
      const isBlack = noteName.includes('#');
      result.push({ midi: i, name: `${noteName}${octave}`, isBlack });
    }
    return result;
  }, []);

  const whiteKeys = keys.filter(k => !k.isBlack);
  const blackKeys = keys.filter(k => k.isBlack);

  const handleStart = (e: React.MouseEvent | React.TouchEvent, midi: number) => {
    e.preventDefault();
    onNoteStart?.(midi);
  };

  const handleStop = (e: React.MouseEvent | React.TouchEvent, midi: number) => {
    e.preventDefault();
    onNoteStop?.(midi);
  };

  return (
    <div className="w-full mt-8 select-none relative group">
      {/* Scroll Indicators */}
      <div className="absolute left-0 top-0 bottom-6 w-12 bg-gradient-to-r from-slate-800 to-transparent z-10 pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity" />
      <div className="absolute right-0 top-0 bottom-6 w-12 bg-gradient-to-l from-slate-800 to-transparent z-10 pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity" />
      
      <div className="relative h-28 overflow-x-auto scrollbar-hide pb-4">
        <svg
          viewBox="0 0 1000 100"
          preserveAspectRatio="none"
          className="w-full h-full min-w-[1200px]"
        >
          {/* White Keys */}
          {whiteKeys.map((key, i) => {
            const x = (i / whiteKeys.length) * 1000;
            const width = (1 / whiteKeys.length) * 1000;
            const isActive = activeNotes.includes(key.name);
            return (
              <rect
                key={key.midi}
                x={x}
                y={0}
                width={width - 0.5}
                height={100}
                onMouseDown={(e) => handleStart(e, key.midi)}
                onMouseUp={(e) => handleStop(e, key.midi)}
                onMouseLeave={(e) => { if (isActive) handleStop(e, key.midi); }}
                onTouchStart={(e) => handleStart(e, key.midi)}
                onTouchEnd={(e) => handleStop(e, key.midi)}
                className={`stroke-slate-700 stroke-[0.2] transition-colors duration-75 cursor-pointer ${
                  isActive ? 'fill-emerald-500 shadow-lg' : 'fill-slate-100 hover:fill-slate-200'
                }`}
              />
            );
          })}

          {/* Black Keys */}
          {blackKeys.map((key) => {
            const noteNameWithoutOctave = key.name.replace(/\d/, '');
            const octave = parseInt(key.name.match(/\d/)?.[0] || '0');
            const whiteNoteIndex = whiteKeys.findIndex(wk => wk.name === `${noteNameWithoutOctave[0]}${octave}`);
            if (whiteNoteIndex === -1) return null;

            const x = ((whiteNoteIndex + 0.7) / whiteKeys.length) * 1000;
            const width = (0.6 / whiteKeys.length) * 1000;
            const isActive = activeNotes.includes(key.name);

            return (
              <rect
                key={key.midi}
                x={x}
                y={0}
                width={width}
                height={60}
                onMouseDown={(e) => { e.stopPropagation(); handleStart(e, key.midi); }}
                onMouseUp={(e) => { e.stopPropagation(); handleStop(e, key.midi); }}
                onMouseLeave={(e) => { e.stopPropagation(); if (isActive) handleStop(e, key.midi); }}
                onTouchStart={(e) => { e.stopPropagation(); handleStart(e, key.midi); }}
                onTouchEnd={(e) => { e.stopPropagation(); handleStop(e, key.midi); }}
                className={`stroke-slate-900 stroke-[0.5] transition-colors duration-75 cursor-pointer ${
                  isActive ? 'fill-emerald-400' : 'fill-slate-800 hover:fill-slate-700'
                }`}
              />
            );
          })}
        </svg>
      </div>
      <div className="flex justify-between text-[10px] text-slate-500 mt-1 px-1 font-mono uppercase tracking-tighter w-full min-w-[1200px] overflow-x-auto scrollbar-hide">
        <span className="sticky left-0 bg-slate-800 px-2 rounded">A0 (Low)</span>
        <span>C4 (Middle)</span>
        <span className="sticky right-0 bg-slate-800 px-2 rounded">C8 (High)</span>
      </div>
    </div>
  );
};

export default PianoKeyboard;
