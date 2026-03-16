import React, { useEffect, useRef, useState } from 'react';
import { Factory } from 'vexflow';
import { Note } from 'tonal';

interface SheetMusicProps {
  activeNotes: string[];
}

interface NoteEvent {
  notes: string[];
  timestamp: number;
}

const SheetMusic: React.FC<SheetMusicProps> = ({ activeNotes }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [history, setHistory] = useState<NoteEvent[]>([]);
  
  // Track the last actual non-empty note/chord that was added to the sheet
  const lastDrawnNotesRef = useRef<string>('');
  
  // Track the immediate previous state to detect silence transitions
  const immediateLastStateRef = useRef<string>('');

  // 1. Group active notes into history events
  const activeNotesKey = [...activeNotes].sort().join(',');

  useEffect(() => {
    // If the state has completely changed
    if (activeNotesKey !== immediateLastStateRef.current) {
      
      // If the current state is silence, update our tracking to allow new notes to trigger
      if (activeNotes.length === 0) {
        immediateLastStateRef.current = '';
        lastDrawnNotesRef.current = ''; // Clear the "gate" allowing the same note to be drawn again
      } 
      // If we have actual notes playing
      else if (activeNotes.length > 0) {
        
        // Only draw if these notes are DIFFERENT from the last ones we explicitly drew
        // This means we require a full silence reset before drawing the exact same chord again
        if (activeNotesKey !== lastDrawnNotesRef.current) {
          
          const timer = setTimeout(() => {
            // Confirm the notes haven't changed during the debounce window
            lastDrawnNotesRef.current = activeNotesKey;
            
            setHistory(prev => {
              const newHistory = [...prev];
              newHistory.push({ notes: activeNotes, timestamp: Date.now() });
              
              if (newHistory.length > 8) {
                newHistory.shift();
              }
              return newHistory;
            });
          }, 50); // Small debounce to allow chord notes to arrive together
          
          immediateLastStateRef.current = activeNotesKey;
          return () => clearTimeout(timer);
        }
      }
      
      immediateLastStateRef.current = activeNotesKey;
    }
  }, [activeNotes, activeNotesKey]); 

  // 2. Expire old events after 20 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setHistory(prev => {
        const now = Date.now();
        const filtered = prev.filter(h => now - h.timestamp < 20000);
        if (filtered.length !== prev.length) {
          return filtered;
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // 3. Render VexFlow
  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous render
    containerRef.current.innerHTML = '';

    const vf = new Factory({
      renderer: {
        elementId: containerRef.current as any,
        width: 600, // Slightly wider to fit 8 notes comfortably
        height: 350, // Increased height to prevent clipping
      },
    });

    const score = vf.EasyScore();
    const system = vf.System({ y: 40, spaceBetweenStaves: 16 });

    const formatEvent = (eventNotes: string[], clef: 'treble' | 'bass'): string => {
      const staffNotes = eventNotes.map(noteName => {
        let midi = Note.midi(noteName);
        if (midi === null) return null;

        // Transpose extreme octaves to a readable range for the sheet music visualizer
        // Prevents endless ledger lines and overflowing SVG containers
        if (midi < 36) { // C2
          while (midi < 36) midi += 12;
        } else if (midi > 84) { // C6
          while (midi > 84) midi -= 12;
        }

        return { original: noteName, midi };
      }).filter(Boolean) as { original: string, midi: number }[];

      const filteredNotes = staffNotes.filter(n => {
        return clef === 'treble' ? n.midi >= 60 : n.midi < 60;
      });

      // Get VexFlow compatible note names
      const mappedNotes = filteredNotes.map(n => Note.fromMidi(n.midi) || n.original);

      // Remove duplicates resulting from transposition
      const uniqueNotes = [...new Set(mappedNotes)];

      if (uniqueNotes.length === 0) {
        return clef === 'treble' ? 'B4/q/r' : 'D3/q/r'; // Quarter rest
      } else if (uniqueNotes.length === 1) {
        return `${uniqueNotes[0]}/q`; // Quarter note
      } else {
        return `(${uniqueNotes.join(' ')})/q`; // Chord
      }
    };

    let trebleString = '';
    let bassString = '';
    let timeSignature = '4/4';

    if (history.length === 0) {
      trebleString = 'B4/w/r';
      bassString = 'D3/w/r';
      timeSignature = '4/4';
    } else {
      trebleString = history.map(h => formatEvent(h.notes, 'treble')).join(', ');
      bassString = history.map(h => formatEvent(h.notes, 'bass')).join(', ');
      timeSignature = `${history.length}/4`;
    }

    try {
      // Create the Treble Stave
      system.addStave({
        voices: [
          score.voice(score.notes(trebleString, { clef: 'treble' }), { time: timeSignature }),
        ],
      }).addClef('treble');

      // Create the Bass Stave
      system.addStave({
        voices: [
          score.voice(score.notes(bassString, { clef: 'bass' }), { time: timeSignature }),
        ],
      }).addClef('bass');

      // Connect them with a Grand Staff Brace
      system.addConnector('brace');

      // Draw everything
      vf.draw();

      // Apply light theme styles to SVG elements
      const svg = containerRef.current.querySelector('svg');
      if (svg) {
        svg.style.background = 'transparent';
        const elements = svg.querySelectorAll('path, ellipse, rect');
        elements.forEach((el) => {
          (el as HTMLElement).style.fill = '#000000'; // black
          (el as HTMLElement).style.stroke = '#000000';
        });
      }
    } catch (err) {
      console.error('VexFlow rendering error:', err, 'Notes:', { trebleString, bassString });
    }
  }, [history]);

  return (
    <div className="w-full flex justify-center bg-white rounded-2xl border border-slate-200 p-4 overflow-hidden shadow-inner">
      <div ref={containerRef} className="vexflow-container" />
    </div>
  );
};

export default SheetMusic;
