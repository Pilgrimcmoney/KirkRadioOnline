// DOM Elements
const addMusicBtn = document.getElementById('add-music-btn');
const settingsBtn = document.getElementById('settings-btn');
const loginBtn = document.getElementById('login-btn');
const sourceItems = document.querySelectorAll('.source-selector li');
const playlistItems = document.querySelectorAll('.playlists li');
const playButtons = document.querySelectorAll('.play-button');
const volumeSliders = document.querySelectorAll('.deck-controls-row input[type="range"]');
const crossfader = document.querySelector('.crossfader');
const effectButtons = document.querySelectorAll('.effect-button');
const micToggle = document.getElementById('mic-toggle');
const savePlaylistBtn = document.querySelector('.playlist-section .button:first-child');
const clearPlaylistBtn = document.querySelector('.playlist-section .button:last-child');

// Audio Context and Elements
let audioContext;
let audioSources = [];
let gainNodes = [];
let analyserNodes = [];
let eqNodes = [];
let effectNodes = [];
let microphoneStream = null;
let microphoneGainNode = null;
let microphoneAnalyser = null;
let audioBuffers = [null, null]; // For Deck A and Deck B
let audioPlayingState = [false, false]; // Tracking play state for both decks
let animationFrameId = null;

// Sample Music Data (would be replaced by actual music library)
const sampleTracks = [
    { id: 1, title: "Summer Vibes", artist: "DJ KrazyBeats", duration: "3:45", bpm: 128, url: "https://example.com/tracks/summer-vibes.mp3" },
    { id: 2, title: "Night Groove", artist: "ElectroFlow", duration: "4:12", bpm: 120, url: "https://example.com/tracks/night-groove.mp3" },
    { id: 3, title: "Sunset Dreams", artist: "Coastal Waves", duration: "5:28", bpm: 110, url: "https://example.com/tracks/sunset-dreams.mp3" },
    { id: 4, title: "Urban Beat", artist: "City Soundz", duration: "3:10", bpm: 140, url: "https://example.com/tracks/urban-beat.mp3" },
    { id: 5, title: "Chill Mode", artist: "Relaxation", duration: "6:22", bpm: 90, url: "https://example.com/tracks/chill-mode.mp3" }
];

// Initialize audio context when user interacts with the page
function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        setupAudioNodes();
        createMicLevelVisualizer();
        populatePlaylist();
    }
}

// Set up audio processing nodes
function setupAudioNodes() {
    for (let i = 0; i < 2; i++) {
        // Create gain node for volume control
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 0.75; // Initial volume at 75%
        gainNodes.push(gainNode);
        
        // Create analyser node for waveform visualization
        const analyserNode = audioContext.createAnalyser();
        analyserNode.fftSize = 256;
        analyserNodes.push(analyserNode);
        
        // Create 3-band EQ (low, mid, high)
        const eqLow = audioContext.createBiquadFilter();
        eqLow.type = 'lowshelf';
        eqLow.frequency.value = 320;
        eqLow.gain.value = 0;
        
        const eqMid = audioContext.createBiquadFilter();
        eqMid.type = 'peaking';
        eqMid.frequency.value = 1000;
        eqMid.Q.value = 0.5;
        eqMid.gain.value = 0;
        
        const eqHigh = audioContext.createBiquadFilter();
        eqHigh.type = 'highshelf';
        eqHigh.frequency.value = 3200;
        eqHigh.gain.value = 0;
        
        eqNodes.push([eqLow, eqMid, eqHigh]);
        
        // Connect nodes: source -> eq -> gain -> analyser -> destination
        eqLow.connect(eqMid);
        eqMid.connect(eqHigh);
        eqHigh.connect(gainNode);
        gainNode.connect(analyserNode);
        analyserNode.connect(audioContext.destination);
    }
}

// Load audio file to a deck
async function loadAudioToDeck(url, deckIndex) {
    try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        audioBuffers[deckIndex] = audioBuffer;
        
        // Update deck display
        const deckElement = document.getElementById(deckIndex === 0 ? 'deck-left' : 'deck-right');
        const deckTitle = deckElement.querySelector('.deck-title');
        const deckTime = deckElement.querySelector('.deck-time');
        
        // Set track name from selected playlist item
        deckTitle.textContent = `Deck ${deckIndex === 0 ? 'A' : 'B'} - Track ${deckIndex + 1}`;
        
        // Format time display
        const minutes = Math.floor(audioBuffer.duration / 60);
        const seconds = Math.floor(audioBuffer.duration % 60).toString().padStart(2, '0');
        deckTime.textContent = `0:00 / ${minutes}:${seconds}`;
        
        // Generate waveform visualization
        generateWaveform(audioBuffer, deckIndex);
        
    } catch (error) {
        console.error("Error loading audio:", error);
        alert("Failed to load audio track. Please try another file.");
    }
}

// Generate waveform visualization
function generateWaveform(audioBuffer, deckIndex) {
    const deckElement = document.getElementById(deckIndex === 0 ? 'deck-left' : 'deck-right');
    const waveformElement = deckElement.querySelector('.waveform-image');
    
    // Get audio data
    const channelData = audioBuffer.getChannelData(0);
    const samplesPerPixel = Math.floor(channelData.length / waveformElement.clientWidth);
    
    // Create canvas to draw waveform
    const canvas = document.createElement('canvas');
    canvas.width = waveformElement.clientWidth;
    canvas.height = waveformElement.clientHeight;
    const ctx = canvas.getContext('2d');
    
    // Clear previous waveform
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set styling
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    if (deckIndex === 0) {
        gradient.addColorStop(0, 'rgba(231, 76, 60, 0.8)');
        gradient.addColorStop(1, 'rgba(231, 76, 60, 0.2)');
    } else {
        gradient.addColorStop(0, 'rgba(52, 152, 219, 0.8)');
        gradient.addColorStop(1, 'rgba(52, 152, 219, 0.2)');
    }
    ctx.fillStyle = gradient;
    
    // Draw waveform
    for (let x = 0; x < canvas.width; x++) {
        const startSample = x * samplesPerPixel;
        let min = 1.0;
        let max = -1.0;
        
        for (let j = 0; j < samplesPerPixel; j++) {
            const sample = channelData[startSample + j];
            if (sample < min) min = sample;
            if (sample > max) max = sample;
        }
        
        const height = (max - min) * canvas.height * 0.8;
        const y = (canvas.height - height) / 2;
        
        ctx.fillRect(x, y, 1, height);
    }
    
    // Apply waveform to element
    waveformElement.style.background = 'none';
    waveformElement.innerHTML = '';
    waveformElement.appendChild(canvas);
}

// Play/pause audio on a deck
function togglePlay(deckIndex) {
    if (!audioContext) initAudioContext();
    
    if (!audioBuffers[deckIndex]) {
        // If no track is loaded, load a sample track
        loadAudioToDeck(sampleTracks[deckIndex].url, deckIndex);
        return;
    }
    
    if (audioPlayingState[deckIndex]) {
        // Stop playback
        if (audioSources[deckIndex]) {
            audioSources[deckIndex].stop();
            audioSources[deckIndex] = null;
        }
        audioPlayingState[deckIndex] = false;
        playButtons[deckIndex].textContent = 'Play';
        
        // Stop animation if both decks are stopped
        if (!audioPlayingState[0] && !audioPlayingState[1] && animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    } else {
        // Start playback
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffers[deckIndex];
        
        // Connect through processing chain
        source.connect(eqNodes[deckIndex][0]);
        
        audioSources[deckIndex] = source;
        audioPlayingState[deckIndex] = true;
        playButtons[deckIndex].textContent = 'Pause';
        
        source.start(0);
        source.onended = () => {
            audioPlayingState[deckIndex] = false;
            playButtons[deckIndex].textContent = 'Play';
            audioSources[deckIndex] = null;
        };
        
        // Start animation if not already running
        if (!animationFrameId) {
            animatePlayhead();
        }
    }
}

// Animate playhead for playing decks
function animatePlayhead() {
    const updatePlayhead = () => {
        for (let i = 0; i < 2; i++) {
            if (audioPlayingState[i] && audioSources[i] && audioBuffers[i]) {
                const deckElement = document.getElementById(i === 0 ? 'deck-left' : 'deck-right');
                const playhead = deckElement.querySelector('.playhead');
                const deckTime = deckElement.querySelector('.deck-time');
                
                // Calculate current position percentage
                const elapsed = audioContext.currentTime - audioSources[i].startTime;
                const duration = audioBuffers[i].duration;
                const position = Math.min(elapsed / duration, 1);
                
                // Update playhead position
                playhead.style.left = `${position * 100}%`;
                
                // Update time display
                const elapsedMinutes = Math.floor(elapsed / 60);
                const elapsedSeconds = Math.floor(elapsed % 60).toString().padStart(2, '0');
                const totalMinutes = Math.floor(duration / 60);
                const totalSeconds = Math.floor(duration % 60).toString().padStart(2, '0');
                deckTime.textContent = `${elapsedMinutes}:${elapsedSeconds} / ${totalMinutes}:${totalSeconds}`;
            }
        }
        
        // Continue animation if any deck is playing
        if (audioPlayingState[0] || audioPlayingState[1]) {
            animationFrameId = requestAnimationFrame(updatePlayhead);
        }
    };
    
    animationFrameId = requestAnimationFrame(updatePlayhead);
}

// Handle volume change
function handleVolumeChange(deckIndex, value) {
    if (gainNodes[deckIndex]) {
        gainNodes[deckIndex].gain.value = value / 100;
    }
}

// Handle EQ change
function handleEQChange(deckIndex, eqIndex, value) {
    if (eqNodes[deckIndex] && eqNodes[deckIndex][eqIndex]) {
        // Convert slider value (0-100) to dB (-12 to +12)
        const dbValue = (value / 100) * 24 - 12;
        eqNodes[deckIndex][eqIndex].gain.value = dbValue;
    }
}

// Handle crossfader changes
function handleCrossfader(value) {
    const position = value / 100;
    
    // Crossfade between decks (equal power crossfade)
    const gainA = Math.cos(position * Math.PI / 2);
    const gainB = Math.sin(position * Math.PI / 2);
    
    if (gainNodes[0]) gainNodes[0].gain.value = gainA;
    if (gainNodes[1]) gainNodes[1].gain.value = gainB;
}

// Toggle effect
function toggleEffect(deckIndex, effectType) {
    // Implementation would depend on the specific effect
    console.log(`Toggle ${effectType} effect for deck ${deckIndex}`);
    
    // This is a simplified example - a real implementation would create and connect
    // appropriate audio nodes for each effect type
}

// Microphone controls
async function toggleMicrophone() {
    if (!audioContext) initAudioContext();
    
    if (microphoneStream) {
        // Turn off microphone
        microphoneStream.getTracks().forEach(track => track.stop());
        microphoneStream = null;
        microphoneGainNode.disconnect();
        microphoneGainNode = null;
        microphoneAnalyser.disconnect();
        microphoneAnalyser = null;
        micToggle.textContent = 'OFF';
        micToggle.classList.remove('active');
    } else {
        try {
            // Request microphone access
            microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Create and connect nodes
            const micSource = audioContext.createMediaStreamSource(microphoneStream);
            microphoneGainNode = audioContext.createGain();
            microphoneAnalyser = audioContext.createAnalyser();
            microphoneAnalyser.fftSize = 256;
            
            // Connect nodes
            micSource.connect(microphoneGainNode);
            microphoneGainNode.connect(microphoneAnalyser);
            microphoneGainNode.connect(audioContext.destination);
            
            // Update UI
            micToggle.textContent = 'ON';
            micToggle.classList.add('active');
            
            // Start visualizer
            updateMicrophoneVisualizer();
        } catch (error) {
            console.error("Error accessing microphone:", error);
            alert("Failed to access microphone. Please check your permissions.");
        }
    }
}

// Create microphone level visualizer
function createMicLevelVisualizer() {
    const micLevelsContainer = document.getElementById('mic-levels');
    
    // Create 30 level bars
    for (let i = 0; i < 30; i++) {
        const bar = document.createElement('div');
        bar.className = 'mic-level-bar';
        micLevelsContainer.appendChild(bar);
    }
}

// Update microphone visualizer
function updateMicrophoneVisualizer() {
    if (!microphoneAnalyser || !microphoneStream) return;
    
    const bars = document.querySelectorAll('.mic-level-bar');
    const dataArray = new Uint8Array(microphoneAnalyser.frequencyBinCount);
    
    const updateLevels = () => {
        microphoneAnalyser.getByteFrequencyData(dataArray);
        
        // Calculate average level
        let average = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
        average = Math.min(average * 1.5, 255); // Amplify and cap at 255
        
        // Update bars
        bars.forEach((bar, index) => {
            const threshold = (bars.length - index) * (255 / bars.length);
            if (average >= threshold) {
                const intensity = Math.min(1, (average - threshold) / 30);
                bar.style.height = `${intensity * 100}%`;
                
                // Color based on level
                if (index > bars.length * 0.8) {
                    bar.style.backgroundColor = '#e74c3c'; // Red for high levels
                } else if (index > bars.length * 0.5) {
                    bar.style.backgroundColor = '#f39c12'; // Orange for medium levels
                } else {
                    bar.style.backgroundColor = '#2ecc71'; // Green for low levels
                }
            } else {
                bar.style.height = '0';
            }
        });
        
        // Continue animation if microphone is active
        if (microphoneStream) {
            requestAnimationFrame(updateLevels);
        }
    };
    
    requestAnimationFrame(updateLevels);
}

// Handle microphone effect changes
function handleMicEffect(effectType, value) {
    if (!microphoneGainNode) return;
    
    switch (effectType) {
        case 'gain':
            microphoneGainNode.gain.value = value / 100;
            break;
        case 'reverb':
        case 'echo':
        case 'bass':
        case 'mid':
        case 'treble':
            // Implementation would connect appropriate effect nodes
            console.log(`Setting microphone ${effectType} to ${value}`);
            break;
    }
}

// Populate playlist
function populatePlaylist() {
    const playlistTable = document.querySelector('.playlist-table');
    const tbody = document.createElement('tbody');
    
    sampleTracks.forEach((track, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${track.title}</td>
            <td>${track.artist}</td>
            <td>${track.duration}</td>
            <td>${track.bpm}</td>
            <td>
                <button class="button load-button" data-deck="0" data-track="${index}">Load A</button>
                <button class="button load-button" data-deck="1" data-track="${index}">Load B</button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    playlistTable.appendChild(tbody);
    
    // Add event listeners to load buttons
    document.querySelectorAll('.load-button').forEach(button => {
        button.addEventListener('click', () => {
            const deckIndex = parseInt(button.getAttribute('data-deck'));
            const trackIndex = parseInt(button.getAttribute('data-track'));
            loadAudioToDeck(sampleTracks[trackIndex].url, deckIndex);
        });
    });
}

// Create modal for adding music
function createAddMusicModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'add-music-modal';
    
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal">&times;</span>
            <h2>Add Music</h2>
            
            <div class="tabs-container">
                <div class="tab-buttons">
                    <button class="tab-button active" data-tab="upload">Upload Files</button>
                    <button class="tab-button" data-tab="search">Search Online</button>
                    <button class="tab-button" data-tab="import">Import Playlist</button>
                </div>
                
                <div class="tab-content active" id="upload-tab">
                    <div class="upload-area">
                        <p>Drop your audio files here or</p>
                        <button class="button">Browse Files</button>
                        <p><small>Supports MP3, WAV, AIFF, FLAC up to 50MB</small></p>
                    </div>
                    <p>Recent Uploads:</p>
                    <ul class="upload-list">
                        <li>No recent uploads</li>
                    </ul>
                </div>
                
                <div class="tab-content" id="search-tab">
                    <div class="search-container">
                        <input type="text" class="search-input" placeholder="Search for tracks, artists, or albums...">
                        <button class="button">Search</button>
                    </div>
                    <div class="search-results">
                        <p>Enter a search term above to find music.</p>
                    </div>
                </div>
                
                <div class="tab-content" id="import-tab">
                    <div class="input-group">
                        <label>Import from:</label>
                        <select>
                            <option>Spotify</option>
                            <option>SoundCloud</option>
                            <option>YouTube</option>
                            <option>iTunes</option>
                        </select>
                    </div>
                    <div class="input-group">
                        <label>Playlist URL or ID:</label>
                        <input type="text" placeholder="Enter playlist URL or ID">
                    </div>
                    <button class="button">Import Playlist</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Tab functionality
    modal.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            // Deactivate all tabs
            modal.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            modal.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            // Activate selected tab
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab') + '-tab';
            document.getElementById(tabId).classList.add('active');
        });
    });
    
    // Close modal functionality
    modal.querySelector('.close-modal').addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    return modal;
}

// Create settings modal
function createSettingsModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'settings-modal';
    
    modal.innerHTML = `
        <div class="modal-content settings-modal-content">
            <span class="close-modal">&times;</span>
            <h2>Settings</h2>
            
            <div class="tabs-container">
                <div class="tab-buttons">
                    <button class="tab-button active" data-tab="general">General</button>
                    <button class="tab-button" data-tab="audio">Audio</button>
                    <button class="tab-button" data-tab="appearance">Appearance</button>
                    <button class="tab-button" data-tab="hotkeys">Hotkeys</button>
                    <button class="tab-button" data-tab="about">About</button>
                </div>
                
                <div class="tab-content active" id="general-tab">
                    <div class="settings-grid">
                        <div class="settings-card">
                            <h3>Interface Settings</h3>
                            <div class="input-group">
                                <label>
                                    <input type="checkbox" checked> Show tooltips
                                </label>
                            </div>
                            <div class="input-group">
                                <label>
                                    <input type="checkbox" checked> Auto-analyze tracks
                                </label>
                            </div>
                            <div class="input-group">
                                <label>
                                    <input type="checkbox" checked> Auto-save library
                                </label>
                            </div>
                        </div>
                        
                        <div class="settings-card">
                            <h3>Playback Settings</h3>
                            <div class="input-group">
                                <label>
                                    <input type="checkbox" checked> Auto-crossfade between tracks
                                </label>
                            </div>
                            <div class="input-group">
                                <label>Crossfade duration</label>
                                <select>
                                    <option>1 second</option>
                                    <option selected>2 seconds</option>
                                    <option>4 seconds</option>
                                    <option>8 seconds</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="settings-card">
                            <h3>Performance</h3>
                            <div class="input-group">
                                <label>Waveform quality</label>
                                <select>
                                    <option>Low</option>
                                    <option selected>Medium</option>
                                    <option>High</option>
                                </select>
                            </div>
                            <div class="input-group">
                                <label>
                                    <input type="checkbox" checked> Hardware acceleration
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="tab-content" id="audio-tab">
                    <div class="settings-grid">
                        <div class="settings-card">
                            <h3>Output Device</h3>
                            <div class="input-group">
                                <label>Output device</label>
                                <select>
                                    <option selected>Default System Output</option>
                                    <option>External Audio Interface</option>
                                    <option>Bluetooth Headphones</option>
                                </select>
                            </div>
                            <div class="input-group">
                                <label>Sample rate</label>
                                <select>
                                    <option>44.1 kHz</option>
                                    <option selected>48 kHz</option>
                                    <option>96 kHz</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="settings-card">
                            <h3>Input Device</h3>
                            <div class="input-group">
                                <label>Microphone</label>
                                <select>
                                    <option selected>Default System Microphone</option>
                                    <option>External Microphone</option>
                                    <option>Audio Interface Input 1</option>
                                </select>
                            </div>
                            <div class="input-group">
                                <label>
                                    <input type="checkbox" checked> Noise reduction
                                </label>
                            </div>
                        </div>
                        
                        <div class="settings-card">
                            <h3>Audio Effects</h3>
                            <div class="input-group">
                                <label>
                                    <input type="checkbox" checked> Enable effects engine
                                </label>
                            </div>
                            <div class="input-group">
                                <label>Maximum effect chain length</label>
                                <select>
                                    <option>3 effects</option>
                                    <option selected>5 effects</option>
                                    <option>10 effects</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="tab-content" id="appearance-tab">
                    <div class="settings-card">
                        <h3>Theme</h3>
                        <div class="theme-selector">
                            <div class="theme-option default selected" data-theme="theme-default"></div>
                            <div class="theme-option dark" data-theme="theme-dark"></div>
                            <div class="theme-option neon" data-theme="theme-neon"></div>
                            <div class="theme-option club" data-theme="theme-club"></div>
                        </div>
                    </div>
                    
                    <div class="settings-card">
                        <h3>Waveform Colors</h3>
                        <div class="input-group">
                            <label>Deck A color</label>
                            <input type="color" value="#e74c3c">
                        </div>
                        <div class="input-group">
                            <label>Deck B color</label>
                            <input type="color" value="#3498db">
                        </div>
                    </div>
                </div>
                
                <div class="tab-content" id="hotkeys-tab">
                    <div class="settings-card">
                        <h3>Transport Controls</h3>
                        <div class="input-group">
                            <label>Play/Pause Deck A</label>
                            <input type="text" value="F1" readonly>
                        </div>
                        <div class="input-group">
                            <label>Play/Pause Deck B</label>
                            <input type="text" value="F2" readonly>
                        </div>
                        <div class="input-group">
                            <label>Cue Deck A</label>
                            <input type="text" value="1" readonly>
                        </div>
                        <div class="input-group">
                            <label>Cue Deck B</label>
                            <input type="text" value="2" readonly>
                        </div>
                    </div>
                    
                    <div class="settings-card">
                        <h3>Mixer Controls</h3>
                        <div class="input-group">
                            <label>Crossfader Left</label>
                            <input type="text" value="Z" readonly>
                        </div>
                        <div class="input-group">
                            <label>Crossfader Right</label>
                            <input type="text" value="X" readonly>
                        </div>
                        <div class="input-group">
                            <label>Toggle Microphone</label>
                            <input type="text" value="M" readonly>
                        </div>
                    </div>
                </div>
                
                <div class="tab-content" id="about-tab">
                    <div class="settings-card">
                        <h3>Kirk Radio DJ</h3>
                        <p>Version 1.0.0</p>
                        <p>©2025 Kirk Radio DJ Software</p>
                        <p>All rights reserved.</p>
                        <p>&nbsp;</p>
                        <p>Thank you for using Kirk Radio DJ!</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Tab functionality
    modal.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            // Deactivate all tabs
            modal.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            modal.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            // Activate selected tab
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab') + '-tab';
            document.getElementById(tabId).classList.add('active');
        });
    });