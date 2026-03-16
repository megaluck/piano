import { useState, useRef, useEffect, useCallback } from 'react';
import { BasicPitch, outputToNotesPoly, noteFramesToTime } from '@spotify/basic-pitch';
import * as tf from '@tensorflow/tfjs';
import { midiToNoteName, detectChord } from '../utils/musicLogic';
import type { RecordedNote } from '../utils/midiExport';

const MODEL_URL = 'https://unpkg.com/@spotify/basic-pitch@1.0.1/model/model.json';

export const useAudioProcessor = () => {
  const [isActive, setIsActive] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [activeNotes, setActiveNotes] = useState<string[]>([]);
  const [detectedChord, setDetectedChord] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Advanced Features State
  const [isSustainEnabled, setIsSustainEnabled] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedNotes, setRecordedNotes] = useState<RecordedNote[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [volumeLevel, setVolumeLevel] = useState(0);

  // Device Selection State
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  const audioContextRef = useRef<AudioContext | null>(null);
  const basicPitchRef = useRef<BasicPitch | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);
  const sustainedNotesRef = useRef<Set<string>>(new Set());
  const virtualNotesRef = useRef<Set<string>>(new Set());
  const virtualNoteStartTimesRef = useRef<Record<number, number>>({});
  const isEvaluatingRef = useRef<boolean>(false);

  // Fetch available audio devices
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const audioInputDevices = allDevices.filter(device => device.kind === 'audioinput');
        setDevices(audioInputDevices);
        if (audioInputDevices.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(audioInputDevices[0].deviceId);
        }
      } catch (err) {
        console.error('Error fetching devices:', err);
      }
    };

    // Ask for permission first to get the device labels
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        stream.getTracks().forEach(track => track.stop());
        fetchDevices();
      })
      .catch(() => fetchDevices()); // Fallback if permission denied initially

    navigator.mediaDevices.addEventListener('devicechange', fetchDevices);
    return () => navigator.mediaDevices.removeEventListener('devicechange', fetchDevices);
  }, [selectedDeviceId]);

  // Load the model on mount
  useEffect(() => {
    const loadModel = async () => {
      try {
        await tf.ready();
        const basicPitch = new BasicPitch(MODEL_URL);
        basicPitchRef.current = basicPitch;
        setIsModelLoading(false);
        console.log('Basic Pitch model loaded successfully.');
      } catch (err) {
        console.error('Failed to load Basic Pitch model:', err);
        setError('Failed to load detection model. Please check your internet connection.');
        setIsModelLoading(false);
      }
    };

    loadModel();
  }, []);

  const stopDetection = useCallback(() => {
    setIsActive(false);
    setIsRecording(false);
    setVolumeLevel(0);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setActiveNotes([]);
    setDetectedChord('');
    sustainedNotesRef.current.clear();
    virtualNotesRef.current.clear();
  }, []);

  const toggleRecording = () => {
    if (!isRecording) {
      setRecordedNotes([]);
      setElapsedTime(0);
      startTimeRef.current = Date.now();
      setIsRecording(true);
    } else {
      setIsRecording(false);
    }
  };

  const startVirtualNote = useCallback((midi: number) => {
    const noteName = midiToNoteName(midi);
    virtualNotesRef.current.add(noteName);
    
    if (isRecording && audioContextRef.current) {
      virtualNoteStartTimesRef.current[midi] = (Date.now() - startTimeRef.current) / 1000;
    }

    setActiveNotes(prev => {
      const next = [...new Set([...prev, noteName])];
      setDetectedChord(detectChord(next));
      return next;
    });
  }, [isRecording]);

  const stopVirtualNote = useCallback((midi: number) => {
    const noteName = midiToNoteName(midi);
    
    if (isSustainEnabled) {
      sustainedNotesRef.current.add(noteName);
    }
    
    virtualNotesRef.current.delete(noteName);

    if (isRecording && audioContextRef.current && virtualNoteStartTimesRef.current[midi] !== undefined) {
      const startT = virtualNoteStartTimesRef.current[midi];
      const endT = (Date.now() - startTimeRef.current) / 1000;
      setRecordedNotes(prev => [...prev, {
        pitchMidi: midi,
        startTimeSeconds: startT,
        durationSeconds: Math.max(0.1, endT - startT),
        velocity: 0.8
      }]);
      delete virtualNoteStartTimesRef.current[midi];
    }

    setActiveNotes(prev => {
      const next = prev.filter(n => n !== noteName || (isSustainEnabled && sustainedNotesRef.current.has(n)));
      setDetectedChord(detectChord(next));
      return next;
    });
  }, [isRecording, isSustainEnabled]);

  const clearAllVirtualNotes = useCallback(() => {
    // Forcefully stop all currently active virtual notes
    const activeMidis = Object.keys(virtualNoteStartTimesRef.current).map(Number);
    activeMidis.forEach(midi => {
       stopVirtualNote(midi);
    });
    // Fallback clear just in case
    virtualNotesRef.current.clear();
    virtualNoteStartTimesRef.current = {};
    
    setActiveNotes(prev => {
      const next = prev.filter(n => isSustainEnabled ? sustainedNotesRef.current.has(n) : false);
      setDetectedChord(detectChord(next));
      return next;
    });
  }, [stopVirtualNote, isSustainEnabled]);

  // Clean up all notes when mouse is released globally
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      clearAllVirtualNotes();
    };
    
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [clearAllVirtualNotes]);

  const startDetection = useCallback(async () => {
    try {
      setError(null);
      const audioContext = new AudioContext({ sampleRate: 22050 });
      audioContextRef.current = audioContext;
      await audioContext.resume();

      const constraints = {
        audio: {
          ...(selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : {}),
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const source = audioContext.createMediaStreamSource(stream);
      
      // Smooth Volume Meter via AnalyserNode
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateVolume = () => {
        if (!streamRef.current) return;
        analyser.getByteTimeDomainData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const v = (dataArray[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / dataArray.length);
        setVolumeLevel(Math.min(1, rms * 4));
        requestAnimationFrame(updateVolume);
      };
      updateVolume();

      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      
      // Prevent feedback loop by connecting to a muted GainNode instead of destination
      const dummyGain = audioContext.createGain();
      dummyGain.gain.value = 0;

      source.connect(processor);
      processor.connect(dummyGain);
      dummyGain.connect(audioContext.destination);

      setIsActive(true);
      const sessionStartTime = audioContext.currentTime;

      processor.onaudioprocess = async (e) => {
        if (!streamRef.current) return;
        if (isEvaluatingRef.current) return; // Drop frame if AI is still thinking
        isEvaluatingRef.current = true;
        
        try {
          const inputData = e.inputBuffer.getChannelData(0);
          
          const audioBuffer = audioContext.createBuffer(1, inputData.length, audioContext.sampleRate);
          audioBuffer.copyToChannel(inputData, 0);

          if (basicPitchRef.current) {
            const frames: number[][] = [];
            const onsets: number[][] = [];
            const contours: number[][] = [];

            await basicPitchRef.current.evaluateModel(
              audioBuffer,
              (f, o, c) => {
                frames.push(...f);
                onsets.push(...o);
                contours.push(...c);
              },
              () => {}
            );

            // Increased thresholds:
            // onset_thresh (0.6): requires a stronger attack
            // frame_thresh (0.4): requires a stronger sustained note
            // min_note_len (10): filters out very short anomalous blips
            const projectedNotes = outputToNotesPoly(frames, onsets, 0.6, 0.4, 10);
            const timeNotes = noteFramesToTime(projectedNotes);
            
            const currentMidis = [...new Set(timeNotes.map(n => Math.round(n.pitchMidi)))];
            const currentNoteNames = currentMidis.map(midiToNoteName);

            // Sustain Logic
            if (isSustainEnabled) {
              currentNoteNames.forEach(n => sustainedNotesRef.current.add(n));
            } else {
              sustainedNotesRef.current.clear();
            }

            const finalNotesToShow = [...new Set([
              ...currentNoteNames, 
              ...Array.from(sustainedNotesRef.current),
              ...Array.from(virtualNotesRef.current)
            ])];
            
            setActiveNotes(finalNotesToShow);
            setDetectedChord(detectChord(finalNotesToShow));

            // Recording Logic
            if (isRecording) {
              const sessionRelativeTime = audioContext.currentTime - sessionStartTime;
              const newRecordedNotes: RecordedNote[] = timeNotes.map(n => ({
                pitchMidi: Math.round(n.pitchMidi),
                startTimeSeconds: n.startTimeSeconds + sessionRelativeTime,
                durationSeconds: n.durationSeconds,
                velocity: 0.8
              }));
              
              setRecordedNotes(prev => [...prev, ...newRecordedNotes]);
              setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
            }
          }
        } finally {
          isEvaluatingRef.current = false;
        }
      };

    } catch (err) {
      console.error('Error starting audio detection:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
         setError('Microphone access blocked: Browsers require HTTPS to use the mic over a network.');
      } else {
         setError(`Engine failed to start: ${errorMessage}`);
      }
      setIsActive(false);
    }
  }, [isSustainEnabled, isRecording, selectedDeviceId]);

  return {
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
    clearAllVirtualNotes,
    audioContext: audioContextRef.current,
    devices,
    selectedDeviceId,
    setSelectedDeviceId
  };
};
