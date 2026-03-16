# Piano Scribe - Application Overview

**Piano Scribe** is a real-time, interactive web application designed for musicians, students, and hobbyists to transcribe, visualize, and record piano music directly from their browser. Built with React and TypeScript, it leverages modern web audio technologies and machine learning to provide a comprehensive "Pro Transcription" experience.

## Core Features & Functionality

### 1. Real-Time Audio Transcription (The Engine)
At the heart of the app is an audio processing engine powered by **Spotify's Basic Pitch** machine learning model and **TensorFlow.js**. 
- By clicking "Start Engine", the app requests microphone access and listens to your physical piano (or any polyphonic instrument).
- It analyzes the audio stream in real-time to detect the specific pitches being played.
- It supports polyphony, meaning it can detect multiple notes played simultaneously (chords) rather than just single melodies.

### 2. Live Visualizations
The app provides multiple ways to visualize the notes you play or the notes the AI detects:
- **Dynamic Chord Display:** A large, prominent display shows the current chord being played based on the active notes.
- **Interactive Sheet Music:** Using the `vexflow` library, the app dynamically generates standard musical notation (a Grand Staff with Treble and Bass clefs) that updates live as notes are played.
- **Virtual Piano Keyboard:** A fully playable, on-screen keyboard that lights up to reflect the detected audio frequencies. You can also click or tap these keys to play notes directly.
- **Active Frequencies List:** A live-updating log showing the specific names of the notes currently ringing out.

### 3. Musical Utilities
- **Naming System Toggle:** Users can seamlessly switch between the standard English alphabet notation (C, D, E...) and Solfege notation (Do, Re, Mi...).
- **Metronome:** A built-in, adjustable metronome to help keep time while practicing or recording.
- **Sustain Pedal Simulation:** A toggleable feature that allows notes to ring out and combine into larger chords over time, mimicking a real piano's sustain pedal.

### 4. Studio Recorder & MIDI Export
- **Recording:** Users can record their sessions by clicking the "Start REC" button. This captures the exact timing, duration, and pitch of every note played (whether virtually or via the microphone).
- **Export to MIDI:** Once a recording is stopped, the app allows users to export the recorded performance as a standard `.mid` file using `midi-writer-js`. This file can then be imported into any Digital Audio Workstation (DAW) like Ableton, Logic Pro, or FL Studio for further production.

## Technical Stack Summary
- **Frontend Framework:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS + Lucide React (for icons)
- **Audio/ML:** `@spotify/basic-pitch`, `@tensorflow/tfjs`, standard Web Audio API
- **Music Theory/Notation:** `tonal` (for chord detection and note logic), `vexflow` (for sheet music rendering)
- **Export:** `midi-writer-js`