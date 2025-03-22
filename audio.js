// Kirk Radio DJ - Audio Module
// Handles audio processing and waveform visualization

let audioContext;
let analyser;

// Initialize audio context
function initializeAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        return true;
    } catch (error) {
        console.error('Failed to initialize audio context:', error);
        return false;
    }
}

// Load and process audio file
async function loadAudioFile(file, deckIndex) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        app.decks[deckIndex].buffer = audioBuffer;
        app.decks[deckIndex].source = null; // Will be created on play
        
        // Create waveform
        createWaveform(audioBuffer, deckIndex);
        
        return true;
    } catch (error) {
        console.error('Error loading audio file:', error);
        showToast('Error loading audio file', 'error');
        return false;
    }
}

// Create waveform visualization
function createWaveform(audioBuffer, deckIndex) {
    const canvas = document.getElementById(`waveform${deckIndex + 1}`);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const data = audioBuffer.getChannelData(0);
    const step = Math.ceil(data.length / canvas.width);
    const amp = canvas.height / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#D42F00';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, amp);

    for (let i = 0; i < canvas.width; i++) {
        let min = 1.0;
        let max = -1.0;
        for (let j = 0; j < step; j++) {
            const datum = data[(i * step) + j];
            if (datum < min) min = datum;
            if (datum > max) max = datum;
        }
        ctx.lineTo(i, (1 + min) * amp);
        ctx.lineTo(i, (1 + max) * amp);
    }

    ctx.stroke();
}

// Play audio
function playAudio(deckIndex) {
    const deck = app.decks[deckIndex];
    if (!deck.buffer) return;

    try {
        // Create new source if needed
        if (!deck.source) {
            deck.source = audioContext.createBufferSource();
            deck.source.buffer = deck.buffer;
            
            // Create gain node if needed
            if (!deck.gainNode) {
                deck.gainNode = audioContext.createGain();
            }
            
            // Connect nodes
            deck.source.connect(deck.gainNode);
            deck.gainNode.connect(audioContext.destination);
        }

        deck.source.start(0);
        deck.playing = true;

        // Update UI
        updatePlayButton(deckIndex, true);
        startProgressUpdate(deckIndex);
    } catch (error) {
        console.error('Error playing audio:', error);
        showToast('Error playing audio', 'error');
    }
}

// Stop audio
function stopAudio(deckIndex) {
    const deck = app.decks[deckIndex];
    if (!deck.source) return;

    try {
        deck.source.stop();
        deck.source = null;
        deck.playing = false;

        // Update UI
        updatePlayButton(deckIndex, false);
        stopProgressUpdate(deckIndex);
    } catch (error) {
        console.error('Error stopping audio:', error);
    }
}

// Update play button UI
function updatePlayButton(deckIndex, isPlaying) {
    const button = document.getElementById(`playBtn${deckIndex + 1}`);
    const icon = document.getElementById(`playIcon${deckIndex + 1}`);
    if (button && icon) {
        icon.className = isPlaying ? 'fas fa-pause' : 'fas fa-play';
    }
}

// Progress bar update
let progressIntervals = [];

function startProgressUpdate(deckIndex) {
    stopProgressUpdate(deckIndex);
    const progressBar = document.getElementById(`deck${deckIndex + 1}Progress`);
    const timeDisplay = document.getElementById(`deck${deckIndex + 1}CurrentTime`);
    const totalTime = document.getElementById(`deck${deckIndex + 1}TotalTime`);

    if (progressBar && timeDisplay && totalTime) {
        const deck = app.decks[deckIndex];
        const duration = deck.buffer.duration;
        let startTime = audioContext.currentTime;

        // Set total time
        totalTime.textContent = formatTime(duration);

        progressIntervals[deckIndex] = setInterval(() => {
            if (!deck.playing) {
                stopProgressUpdate(deckIndex);
                return;
            }

            const elapsed = audioContext.currentTime - startTime;
            const progress = (elapsed / duration) * 100;
            progressBar.style.width = `${Math.min(progress, 100)}%`;
            timeDisplay.textContent = formatTime(elapsed);

            if (progress >= 100) {
                stopAudio(deckIndex);
            }
        }, 50);
    }
}

function stopProgressUpdate(deckIndex) {
    if (progressIntervals[deckIndex]) {
        clearInterval(progressIntervals[deckIndex]);
        progressIntervals[deckIndex] = null;
    }
}

// Time formatting helper
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Export functions
window.initializeAudio = initializeAudio;
window.loadAudioFile = loadAudioFile;
window.playAudio = playAudio;
window.stopAudio = stopAudio;

