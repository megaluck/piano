import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Square, Plus, Minus, Volume2, VolumeX } from 'lucide-react';

interface MetronomeProps {
  bpm: number;
  setBpm: (bpm: number) => void;
}

const Metronome: React.FC<MetronomeProps> = ({ bpm, setBpm }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextNoteTimeRef = useRef(0);
  const timerIDRef = useRef<number | null>(null);

  const lookahead = 25.0; // How frequently to call scheduling function (in milliseconds)
  const scheduleAheadTime = 0.1; // How far ahead to schedule audio (in seconds)

  const playClick = useCallback((time: number) => {
    if (!audioContextRef.current || isMuted) return;

    const osc = audioContextRef.current.createOscillator();
    const envelope = audioContextRef.current.createGain();

    osc.frequency.value = 1000; // Frequency in Hz
    envelope.gain.value = 0.5;
    envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

    osc.connect(envelope);
    envelope.connect(audioContextRef.current.destination);

    osc.start(time);
    osc.stop(time + 0.1);
  }, [isMuted]);

  const schedulerRef = useRef<(() => void) | null>(null);
  
  useEffect(() => {
    schedulerRef.current = () => {
      if (!audioContextRef.current) return;

      while (nextNoteTimeRef.current < audioContextRef.current.currentTime + scheduleAheadTime) {
        playClick(nextNoteTimeRef.current);
        const secondsPerBeat = 60.0 / bpm;
        nextNoteTimeRef.current += secondsPerBeat;
      }
      timerIDRef.current = window.setTimeout(() => {
        if (schedulerRef.current) schedulerRef.current();
      }, lookahead);
    };
  }, [bpm, playClick]);

  const toggleMetronome = () => {
    if (!isPlaying) {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      nextNoteTimeRef.current = audioContextRef.current.currentTime;
      if (schedulerRef.current) schedulerRef.current();
      setIsPlaying(true);
    } else {
      if (timerIDRef.current) {
        clearTimeout(timerIDRef.current);
      }
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    return () => {
      if (timerIDRef.current) clearTimeout(timerIDRef.current);
    };
  }, []);

  return (
    <div className="flex items-center gap-4 bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50 shadow-lg">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setBpm(Math.max(40, bpm - 1))}
          className="p-1 hover:bg-slate-700 rounded-lg text-slate-400"
        >
          <Minus size={16} />
        </button>
        <div className="flex flex-col items-center min-w-[60px]">
          <span className="text-xl font-black text-emerald-400 leading-none">{bpm}</span>
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">BPM</span>
        </div>
        <button
          onClick={() => setBpm(Math.min(240, bpm + 1))}
          className="p-1 hover:bg-slate-700 rounded-lg text-slate-400"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="h-8 w-[1px] bg-slate-700 mx-2" />

      <div className="flex items-center gap-2">
        <button
          onClick={toggleMetronome}
          className={`p-3 rounded-xl transition-all ${
            isPlaying ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-blue-500 hover:bg-blue-600 shadow-[0_0_15px_rgba(59,130,246,0.4)]'
          } text-white`}
        >
          {isPlaying ? <Square size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
        </button>

        <button
          onClick={() => setIsMuted(!isMuted)}
          className={`p-3 rounded-xl hover:bg-slate-700 text-slate-400`}
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>
    </div>
  );
};

export default Metronome;
