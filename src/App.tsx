import React, { useState, useRef } from 'react';
import { useAudioProcessor } from './hooks/useAudioProcessor';
import { Mic, MicOff, Music, Piano, Languages, Circle, Square, Download, Wind, Volume2 } from 'lucide-react';
import SheetMusic from './components/SheetMusic';
import PianoKeyboard from './components/PianoKeyboard';
import Metronome from './components/Metronome';
import { toSolfege } from './utils/musicLogic';
import { exportToMidi } from './utils/midiExport';
import { playPianoSound } from './utils/pianoSound';

const App: React.FC = () => {
  const [namingSystem, setNamingSystem] = useState<'english' | 'solfege'>('english');
  const [bpm, setBpm] = useState(120);
  
  // Store active audio stop functions to allow smooth release
  const activeSynthsRef = useRef<Record<number, () => void>>({});

  const { 
    isActive, 
    isModelLoading, 
    activeNotes, 
    detectedChord, 
    error, 
    startDetection, 
    stopDetection,
    isSustainEnabled,
    setIsSustainEnabled,
    isRecording,
    toggleRecording,
    recordedNotes,
    elapsedTime,
    volumeLevel,
    startVirtualNote,
    stopVirtualNote,
    audioContext
  } = useAudioProcessor();

  const formatDisplay = (text: string) => {
    return namingSystem === 'solfege' ? toSolfege(text) : text;
  };

  const handleExport = () => {
    exportToMidi(recordedNotes, bpm);
  };

  const handleNoteStart = (midi: number) => {
    if (activeSynthsRef.current[midi]) return; // Already playing
    
    const ctx = audioContext || new AudioContext();
    const stopSynth = playPianoSound(midi, ctx);
    activeSynthsRef.current[midi] = stopSynth;

    startVirtualNote(midi);
  };

  const handleNoteStop = (midi: number) => {
    if (activeSynthsRef.current[midi]) {
      activeSynthsRef.current[midi]();
      delete activeSynthsRef.current[midi];
    }
    stopVirtualNote(midi);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center p-4 md:p-8 font-sans">
      
      {/* Top Toolbar */}
      <div className="w-full max-w-6xl flex flex-wrap justify-between items-center bg-slate-800/80 backdrop-blur-md p-4 rounded-3xl border border-slate-700/50 shadow-xl mb-8 gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-emerald-500/20 p-3 rounded-2xl">
            <Piano className="text-emerald-400" size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              Piano Scribe
            </h1>
            <p className="text-xs text-slate-400 font-medium tracking-wide uppercase">Pro Transcription</p>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <Metronome bpm={bpm} setBpm={setBpm} />
          
          <div className="h-8 w-[1px] bg-slate-700 hidden md:block" />

          <button
            onClick={() => setNamingSystem(s => s === 'english' ? 'solfege' : 'english')}
            className="flex items-center gap-2 px-5 py-3 bg-slate-700/50 rounded-2xl border border-slate-600/50 text-sm font-bold hover:bg-slate-700 transition-colors shadow-lg group"
          >
            <Languages size={18} className="text-blue-400 group-hover:scale-110 transition-transform" />
            {namingSystem === 'english' ? 'C, D, E...' : 'Do, Re, Mi...'}
          </button>
        </div>
      </div>

      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Visuals */}
        <div className="lg:col-span-2 space-y-8 flex flex-col">
          <div className="bg-slate-800 rounded-3xl shadow-2xl p-6 border border-slate-700 flex-1 flex flex-col">
            
            {/* Large Chord Display */}
            <div className="w-full h-48 bg-slate-950 rounded-2xl flex flex-col items-center justify-center border border-slate-700 shadow-inner relative overflow-hidden mb-6 group">
              <div className="absolute top-4 left-4 text-slate-800 group-hover:text-slate-700 transition-colors duration-500">
                <Music size={64} opacity={0.3} />
              </div>
              
              {detectedChord ? (
                <div className="text-center animate-in fade-in zoom-in duration-300">
                  <span className="text-7xl md:text-8xl font-black text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.3)] tracking-tight">
                    {formatDisplay(detectedChord)}
                  </span>
                </div>
              ) : (
                <span className="text-slate-500 text-lg md:text-xl italic text-center px-4 animate-pulse">
                  {isActive ? 'Play your piano OR click the keys below' : 'Start the engine to begin'}
                </span>
              )}

              <div className="absolute bottom-4 right-4 text-slate-800 group-hover:text-slate-700 transition-colors duration-500">
                <Piano size={64} opacity={0.3} />
              </div>
            </div>

            {/* Sheet Music Staff */}
            <div className="flex-1 min-h-[250px] bg-slate-900/50 rounded-2xl border border-slate-700/50 flex items-center justify-center p-4">
               <SheetMusic activeNotes={activeNotes} />
            </div>

            {/* Virtual Keyboard */}
            <PianoKeyboard 
              activeNotes={activeNotes} 
              onNoteStart={handleNoteStart} 
              onNoteStop={handleNoteStop} 
            />
          </div>
        </div>

        {/* Right Column: Controls & Info */}
        <div className="space-y-6">
          <div className="bg-slate-800 rounded-3xl shadow-2xl p-6 border border-slate-700 h-full flex flex-col gap-6">
            
            {/* Main Toggle with Volume Meter */}
            <div className="flex flex-col gap-2">
              <button
                onClick={isActive ? stopDetection : startDetection}
                disabled={isModelLoading}
                className={`
                  w-full flex items-center justify-center gap-3 px-6 py-5 rounded-2xl font-bold text-xl transition-all transform active:scale-95
                  ${isActive 
                    ? 'bg-red-500/10 text-red-500 border-2 border-red-500/50 hover:bg-red-500/20' 
                    : 'bg-emerald-500 text-white shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:bg-emerald-600'}
                  ${isModelLoading && 'opacity-50 cursor-not-allowed'}
                `}
              >
                {isModelLoading ? (
                  <span className="animate-pulse">Warming up AI...</span>
                ) : isActive ? (
                  <>
                    <MicOff size={24} />
                    Stop Engine
                  </>
                ) : (
                  <>
                    <Mic size={24} />
                    Start Engine
                  </>
                )}
              </button>

              {/* Volume Meter */}
              {isActive && (
                <div className="w-full flex items-center gap-3 px-2">
                  <Volume2 size={14} className="text-slate-500" />
                  <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
                    <div 
                      className="h-full bg-emerald-400 transition-all duration-75"
                      style={{ width: `${Math.min(100, volumeLevel * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Advanced Features */}
            <div className="grid grid-cols-1 gap-4">
              {/* Sustain Pedal */}
              <button
                onClick={() => setIsSustainEnabled(!isSustainEnabled)}
                className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                  isSustainEnabled 
                  ? 'bg-blue-500/10 border-blue-500/50 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)]' 
                  : 'bg-slate-900/50 border-slate-700 text-slate-500 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Wind size={20} />
                  <span className="font-bold">Sustain Pedal</span>
                </div>
                <div className={`w-12 h-6 rounded-full relative transition-colors ${isSustainEnabled ? 'bg-blue-500' : 'bg-slate-700'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isSustainEnabled ? 'left-7' : 'left-1'}`} />
                </div>
              </button>

              {/* Recording */}
              <div className="bg-slate-900/50 rounded-2xl border border-slate-700 p-5 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative flex items-center justify-center w-6 h-6">
                      {isRecording && <div className="absolute w-full h-full bg-red-500 rounded-full animate-ping opacity-20" />}
                      <Circle size={18} className={isRecording ? 'text-red-500 fill-red-500 relative z-10' : 'text-slate-500 relative z-10'} />
                    </div>
                    <span className="font-bold text-slate-300">Studio Recorder</span>
                  </div>
                  {isRecording && (
                    <span className="text-sm font-mono text-red-500 font-black tracking-widest">
                      {Math.floor(elapsedTime / 60).toString().padStart(2, '0')}:{(elapsedTime % 60).toString().padStart(2, '0')}
                    </span>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    disabled={!isActive}
                    onClick={toggleRecording}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all shadow-sm ${
                      isRecording 
                      ? 'bg-red-500 text-white hover:bg-red-600 shadow-[0_0_15px_rgba(239,68,68,0.4)]' 
                      : 'bg-slate-800 text-slate-300 border border-slate-600 hover:bg-slate-700 disabled:opacity-30 disabled:border-slate-800'
                    }`}
                  >
                    {isRecording ? <div className="flex items-center justify-center gap-2"><Square size={14} fill="currentColor" /> Stop REC</div> : 'Start REC'}
                  </button>
                  
                  <button
                    disabled={recordedNotes.length === 0 || isRecording}
                    onClick={handleExport}
                    className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 disabled:opacity-30 disabled:bg-slate-800 disabled:text-slate-500 transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Download size={16} /> Export
                  </button>
                </div>
                
                <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  <span>{recordedNotes.length} events</span>
                  {recordedNotes.length > 0 && <span>Ready</span>}
                </div>
              </div>
            </div>

            {/* Note List */}
            <div className="flex-1 flex flex-col bg-slate-900/30 rounded-2xl p-4 border border-slate-700/30">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                Active Frequencies
              </h3>
              <div className="flex flex-wrap gap-2 overflow-y-auto min-h-[60px] content-start">
                {activeNotes.map((note, index) => (
                  <span 
                    key={`${note}-${index}`} 
                    className="px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20 font-bold text-sm animate-in fade-in slide-in-from-bottom-2 duration-200"
                  >
                    {formatDisplay(note)}
                  </span>
                ))}
                {activeNotes.length === 0 && (
                  <span className="text-slate-600 text-xs italic">Awaiting input...</span>
                )}
              </div>
            </div>

            {error && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <p className="text-red-400 text-sm bg-red-400/10 px-4 py-3 rounded-xl border border-red-400/20 flex items-start gap-2">
                  <span className="font-bold">!</span> {error}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

    </div>
  );
};

export default App;
