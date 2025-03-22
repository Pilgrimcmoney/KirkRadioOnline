// Virtual Turntables - Main Application
// This file handles audio processing, turntable integration, and user interactions

class DJApplication {
    constructor() {
        // Audio context and main nodes
        this.audioContext = null;
        this.masterGain = null;
        
        // Decks configuration
        this.decks = {
            left: {
                audio: null,
                source: null,
                gainNode: null,
                analyser: null,
                lpFilter: null,
                hpFilter: null,
                pitchNode: null,
                turntable: null,
                buffer: null,
                isPlaying: false,
                isPoweredOn: false,
                volume: 0.8,
                pitch: 0,
                filterLow: 1.0,
                filterHigh: 1.0,
                startOffset: 0,
                startTime: 0
            },
            right: {
                audio: null,
                source: null,
                gainNode: null,
                analyser: null,
                lpFilter: null,
                hpFilter: null,
                pitchNode: null,
                turntable: null,
                buffer: null,
                isPlaying: false,
                isPoweredOn: false,
                volume: 0.8,
                pitch: 0,
                filterLow: 1.0,
                filterHigh: 1.0,
                startOffset: 0,
                startTime: 0
            }
        };
        
        // Crossfader and master controls
        this.crossfaderPosition = 0.5; // Center position
        this.masterVolume = 0.8;
        this.isMuted = false;
        
        // Scratch effect variables
        this.scratchData = {
            left: {
                lastX: 0,
                lastY: 0,
                isScratching: false,
                velocity: 0,
                lastTime: 0
            },
            right: {
                lastX: 0,
                lastY: 0,
                isScratching: false,
                velocity: 0,
                lastTime: 0
            }
        };

        // Visualizers
        this.visualizers = {
            left: null,
            right: null
        };

        // Track history for both decks
        this.trackHistory = {
            left: [],
            right: []
        };

        // Initialize the application
        this.init();
    }

    init() {
        // Initialize Web Audio API
        this.initAudioContext();
        
        // Initialize both turntable decks
        this.initDecks();
        
        // Initialize UI controls
        this.initControls();
        
        // Set up visualizers
        this.initVisualizers();
        
        // Set up event listeners
        this.setupEventListeners();

        console.log("Virtual Turntables initialized!");
    }

    initAudioContext() {
        try {
            // Create audio context with fallbacks for different browsers
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            
            // Ensure audio context is running
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume().then(() => {
                    console.log("Audio context resumed successfully");
                }).catch(error => {
                    console.error("Error resuming audio context:", error);
                });
            }
            
            // Master gain node for overall volume control
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = this.masterVolume;
            this.masterGain.connect(this.audioContext.destination);
            
            console.log("Audio context initialized at sample rate:", this.audioContext.sampleRate);
        } catch (e) {
            console.error("Failed to initialize Audio Context:", e);
            alert("Your browser doesn't support Web Audio API. Please use a modern browser.");
        }
    }

    initDecks() {
        // Setup both decks with all necessary audio nodes
        for (const deck of ['left', 'right']) {
            // Gain node for individual deck volume
            this.decks[deck].gainNode = this.audioContext.createGain();
            this.decks[deck].gainNode.gain.value = this.decks[deck].volume;
            
            // Analyser for visualizations
            this.decks[deck].analyser = this.audioContext.createAnalyser();
            this.decks[deck].analyser.fftSize = 2048;
            this.decks[deck].analyser.smoothingTimeConstant = 0.8;
            
            // Low-pass filter
            this.decks[deck].lpFilter = this.audioContext.createBiquadFilter();
            this.decks[deck].lpFilter.type = 'lowshelf';
            this.decks[deck].lpFilter.frequency.value = 500;
            this.decks[deck].lpFilter.gain.value = 0;
            
            // High-pass filter
            this.decks[deck].hpFilter = this.audioContext.createBiquadFilter();
            this.decks[deck].hpFilter.type = 'highshelf';
            this.decks[deck].hpFilter.frequency.value = 2000;
            this.decks[deck].hpFilter.gain.value = 0;
            
            // Connect the audio nodes in order:
            // Source -> Filters -> Gain -> Analyser -> Output (based on crossfader)
            this.decks[deck].lpFilter.connect(this.decks[deck].hpFilter);
            this.decks[deck].hpFilter.connect(this.decks[deck].gainNode);
            this.decks[deck].gainNode.connect(this.decks[deck].analyser);
            
            // Create turntable instances
            const deckElement = document.getElementById(`${deck}-deck`);
            if (deckElement) {
                this.decks[deck].turntable = new Turntable(deckElement, {
                    deckId: deck,
                    onScratch: (velocity) => this.handleScratch(deck, velocity),
                    onPlay: () => this.togglePlay(deck),
                    onStop: () => this.stop(deck),
                    onPowerChange: (isOn) => this.handlePowerChange(deck, isOn)
                });
            } else {
                console.error(`Element with id '${deck}-deck' not found.`);
            }

            // Set initial state
            this.updateCrossfader();
        }
    }

    initControls() {
        // Set up sliders and controls with initial values
        const volumeControls = document.querySelectorAll('.volume-control');
        volumeControls.forEach(control => {
            const deck = control.dataset.deck;
            control.value = this.decks[deck].volume * 100;
        });

        const pitchControls = document.querySelectorAll('.pitch-control');
        pitchControls.forEach(control => {
            control.value = 0; // Center position
        });

        const eqControls = document.querySelectorAll('.eq-control');
        eqControls.forEach(control => {
            control.value = 0; // Flat EQ
        });

        // Set crossfader to middle
        const crossfader = document.getElementById('crossfader');
        if (crossfader) {
            crossfader.value = 50;
        }

        // Setup master volume
        const masterVolumeControl = document.getElementById('master-volume');
        if (masterVolumeControl) {
            masterVolumeControl.value = this.masterVolume * 100;
        }
    }

    initVisualizers() {
        // Configure visualizer canvases
        for (const deck of ['left', 'right']) {
            const canvas = document.getElementById(`${deck}-visualizer`);
            if (canvas) {
                this.visualizers[deck] = canvas.getContext('2d');
                this.drawVisualizer(deck);
            }
        }
    }

    setupEventListeners() {
        // Volume controls
        const volumeControls = document.querySelectorAll('.volume-control');
        volumeControls.forEach(control => {
            control.addEventListener('input', (e) => {
                const deck = e.target.dataset.deck;
                this.setVolume(deck, e.target.value / 100);
            });
        });

        // Pitch controls
        const pitchControls = document.querySelectorAll('.pitch-control');
        pitchControls.forEach(control => {
            control.addEventListener('input', (e) => {
                const deck = e.target.dataset.deck;
                this.setPitch(deck, (e.target.value - 50) / 50 * 12); // +/- 12% range
            });
        });

        // EQ controls
        const eqControls = document.querySelectorAll('.eq-control');
        eqControls.forEach(control => {
            control.addEventListener('input', (e) => {
                const deck = e.target.dataset.deck;
                const type = e.target.dataset.type;
                const value = (e.target.value - 50) / 50 * 15; // +/- 15dB range
                this.setEQ(deck, type, value);
            });
        });

        // Crossfader
        const crossfader = document.getElementById('crossfader');
        if (crossfader) {
            crossfader.addEventListener('input', (e) => {
                this.setCrossfader(e.target.value / 100);
            });
        }

        // Master volume
        const masterVolume = document.getElementById('master-volume');
        if (masterVolume) {
            masterVolume.addEventListener('input', (e) => {
                this.setMasterVolume(e.target.value / 100);
            });
        }

        // Play/Pause buttons
        const playButtons = document.querySelectorAll('.play-button');
        playButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const deck = e.target.closest('.deck').dataset.deck;
                this.togglePlay(deck);
            });
        });

        // Track loading
        const trackInputs = document.querySelectorAll('.track-input');
        trackInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                const deck = e.target.dataset.deck;
                this.loadTrack(deck, e.target.files[0]);
            });
        });

        // Cue buttons
        const cueButtons = document.querySelectorAll('.cue-button');
        cueButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const deck = e.target.closest('.deck').dataset.deck;
                this.setCuePoint(deck);
            });
        });

        // Power buttons
        const powerButtons = document.querySelectorAll('.power-button');
        powerButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const deck = e.target.dataset.deck;
                this.togglePower(deck);
            });
        });

        // Handle window resize for visualizers
        window.addEventListener('resize', () => {
            this.resizeVisualizers();
        });
    }

    // Audio file loading and handling
    loadTrack(deck, file) {
        if (!file) return;
        
        // Display file name
        const trackDisplay = document.querySelector(`#${deck}-deck .track-name`);
        if (trackDisplay) {
            trackDisplay.textContent = file.name;
        }
        
        // Create file reader
        const reader = new FileReader();
        reader.onload = (e) => {
            // Decode audio data
            this.audioContext.decodeAudioData(e.target.result, (buffer) => {
                this.decks[deck].buffer = buffer;
                
                // Add to track history
                this.trackHistory[deck].push({
                    name: file.name,
                    timestamp: new Date().toISOString()
                });
                
                // Automatically play the track if the deck is powered on
                if (this.decks[deck].isPoweredOn) {
                    this.play(deck);
                }
                
                // Update UI to show track is loaded
                const deckElement = document.getElementById(`${deck}-deck`);
                if (deckElement) {
                    deckElement.classList.add('track-loaded');
                }
                
                console.log(`Track loaded on ${deck} deck:`, file.name);
            }, (error) => {
                console.error(`Error decoding audio data for ${deck} deck:`, error);
                alert(`Failed to load track: ${error.message}`);
            });
        };
        
        reader.onerror = (error) => {
            console.error(`Error reading file for ${deck} deck:`, error);
            alert(`Failed to read track file: ${error.message}`);
        };
        
        // Read file as array buffer
        reader.readAsArrayBuffer(file);
    }

    play(deck) {
        // Don't play if deck is not powered on or no track is loaded
        if (!this.decks[deck].isPoweredOn || !this.decks[deck].buffer) {
            console.warn(`Cannot play: deck ${deck} is not powered on or no track loaded.`);
            return;
        }
        
        // Stop any currently playing track on this deck
        if (this.decks[deck].isPlaying) {
            this.stop(deck);
        }
        
        // Create new audio source from buffer
        this.decks[deck].source = this.audioContext.createBufferSource();
        this.decks[deck].source.buffer = this.decks[deck].buffer;
        
        // Create and apply pitch shift effect
        const pitchRate = 1.0 + (this.decks[deck].pitch / 100);
        this.decks[deck].source.playbackRate.value = pitchRate;
        
        // Connect source to effect chain
        this.decks[deck].source.connect(this.decks[deck].lpFilter);
        
        // Set up callback for when track ends
        this.decks[deck].source.onended = () => {
            this.decks[deck].isPlaying = false;
            this.updatePlayButton(deck, false);
            this.decks[deck].turntable.stop();
        };
        
        // Start playback from offset
        this.decks[deck].startTime = this.audioContext.currentTime;
        this.decks[deck].source.start(0, this.decks[deck].startOffset);
        this.decks[deck].isPlaying = true;
        
        // Update UI
        this.updatePlayButton(deck, true);
        
        // Start turntable rotation
        this.decks[deck].turntable.play();
        
        console.log(`Playing track on ${deck} deck from offset:`, this.decks[deck].startOffset);
    }

    stop(deck) {
        if (this.decks[deck].isPlaying && this.decks[deck].source) {
            // Calculate current position in the track for later resuming
            this.decks[deck].startOffset = (this.audioContext.currentTime - this.decks[deck].startTime) 
                * (1.0 + (this.decks[deck].pitch / 100)) + this.decks[deck].startOffset;
            if (this.decks[deck].startOffset >= this.decks[deck].buffer.duration) {
                this.decks[deck].startOffset = 0;
            }
            
            // Stop the audio source
            this.decks[deck].source.stop();
            this.decks[deck].source.disconnect();
            this.decks[deck].source = null;
            this.decks[deck].isPlaying = false;
            
            // Update UI
            this.updatePlayButton(deck, false);
            
            // Stop turntable rotation
            if (this.decks[deck].turntable) {
                this.decks[deck].turntable.stop();
            }
            
            console.log(`Stopped playback on ${deck} deck at offset:`, this.decks[deck].startOffset);
    
    // Set cue point for a deck
    setCuePoint(deck) {
        if (!this.decks[deck].isPoweredOn || !this.decks[deck].buffer) {
            console.warn(`Cannot set cue point: deck ${deck} is not powered on or no track loaded.`);
            return;
        }
        
        // If playing, set cue point at current position
        if (this.decks[deck].isPlaying) {
            const currentTime = this.audioContext.currentTime;
            const elapsedTime = currentTime - this.decks[deck].startTime;
            this.decks[deck].cuePoint = this.decks[deck].startOffset + elapsedTime;
            console.log(`Cue point set for ${deck} deck at:`, this.decks[deck].cuePoint);
        } 
        // If stopped, jump to the cue point or set it at current position
        else {
            if (this.decks[deck].cuePoint !== undefined) {
                // Jump to the cue point
                this.decks[deck].startOffset = this.decks[deck].cuePoint;
                console.log(`Jumped to cue point on ${deck} deck:`, this.decks[deck].cuePoint);
                
                // Play briefly then stop to "preview" the cue point
                this.play(deck);
                setTimeout(() => {
                    if (this.decks[deck].isPlaying) {
                        this.stop(deck);
                    }
                }, 500); // Play for 500ms to preview
            } else {
                // Set cue point at current position
                this.decks[deck].cuePoint = this.decks[deck].startOffset;
                console.log(`Cue point set for ${deck} deck at:`, this.decks[deck].cuePoint);
            }
        }
        
        // Update UI to show cue point is set
        const cueButton = document.querySelector(`#${deck}-deck .cue-button`);
        if (cueButton) {
            cueButton.classList.add('cue-set');
        }
    }
    
    // Toggle power for a deck
    togglePower(deck) {
        if (this.decks[deck].isPoweredOn) {
            // Power off
            this.decks[deck].isPoweredOn = false;
            
            // Stop playback if it's playing
            if (this.decks[deck].isPlaying) {
                this.stop(deck);
            }
            
            // Power off the turntable
            if (this.decks[deck].turntable) {
                this.decks[deck].turntable.powerOff();
            }
            
            // Update UI
            const deckElement = document.getElementById(`${deck}-deck`);
            if (deckElement) {
                deckElement.classList.remove('powered-on');
                deckElement.classList.add('powered-off');
            }
            
            console.log(`Powered off ${deck} deck`);
        } else {
            // Power on
            this.decks[deck].isPoweredOn = true;
            
            // Power on the turntable
            if (this.decks[deck].turntable) {
                this.decks[deck].turntable.powerOn();
            }
            
            // Update UI
            const deckElement = document.getElementById(`${deck}-deck`);
            if (deckElement) {
                deckElement.classList.remove('powered-off');
                deckElement.classList.add('powered-on');
            }
            
            console.log(`Powered on ${deck} deck`);
        }
    }
    
    // Handle scratch effect
    handleScratch(deck, velocity) {
        if (!this.decks[deck].isPoweredOn || !this.decks[deck].buffer) return;
        
        // Record scratch data
        this.scratchData[deck].velocity = velocity;
        this.scratchData[deck].isScratching = true;
        this.scratchData[deck].lastTime = this.audioContext.currentTime;
        
        // If we're playing, temporarily stop normal playback
        if (this.decks[deck].isPlaying) {
            this.scratchData[deck].wasPlaying = true;
            
            // Don't stop the source completely, but pause normal time progression
            this.scratchData[deck].playbackRate = this.decks[deck].source.playbackRate.value;
            this.decks[deck].source.playbackRate.value = 0;
        }
        
        // Apply the scratch effect
        this.applyScratchEffect(deck, velocity);
        
        // Start a timeout to end scratching if no more scratch events are received
        if (this.scratchData[deck].scratchTimeout) {
            clearTimeout(this.scratchData[deck].scratchTimeout);
        }
        
        this.scratchData[deck].scratchTimeout = setTimeout(() => {
            this.endScratch(deck);
        }, 100); // End scratch after 100ms of no input
    }
    
    // Apply the scratch effect to audio
    applyScratchEffect(deck, velocity) {
        if (!this.decks[deck].isPoweredOn || !this.decks[deck].buffer || !this.decks[deck].source) return;
        
        // Calculate time adjustment based on velocity
        const now = this.audioContext.currentTime;
        const delta = now - this.scratchData[deck].lastTime;
        this.scratchData[deck].lastTime = now;
        
        // Scale velocity to an appropriate range for audio rate adjustment
        const adjustedVelocity = velocity * 0.01; // Scale factor
        
        // Apply "scratching" by adjusting current offset
        this.decks[deck].startOffset += adjustedVelocity;
        
        // Ensure offset stays within track bounds
        if (this.decks[deck].startOffset < 0) {
            this.decks[deck].startOffset = 0;
        } else if (this.decks[deck].startOffset > this.decks[deck].buffer.duration) {
            this.decks[deck].startOffset = this.decks[deck].buffer.duration - 0.01;
        }
        
        // Stop and restart the source to apply the new offset
        const wasPlaying = this.decks[deck].isPlaying;
        
        // If currently playing, stop before restarting
        if (wasPlaying) {
            this.decks[deck].source.stop();
            this.decks[deck].source.disconnect();
        }
        
        // Create new source with the new offset
        this.decks[deck].source = this.audioContext.createBufferSource();
        this.decks[deck].source.buffer = this.decks[deck].buffer;
        
        // Set playback rate to reflect scratch velocity
        if (Math.abs(adjustedVelocity) > 0.001) {
            // Playback speed reflects scratch direction
            this.decks[deck].source.playbackRate.value = Math.sign(adjustedVelocity) * 
                (1.0 + Math.min(Math.abs(adjustedVelocity) * 10, 3.0));
        } else {
            // Very small movement, pause playback
            this.decks[deck].source.playbackRate.value = 0;
        }
        
        // Connect to effect chain
        this.decks[deck].source.connect(this.decks[deck].lpFilter);
        
        // Set up callback for when track ends
        this.decks[deck].source.onended = () => {
            // Only act if not manually stopped for scratching
            if (!this.scratchData[deck].isScratching) {
                this.decks[deck].isPlaying = false;
                this.updatePlayButton(deck, false);
                if (this.decks[deck].turntable) {
                    this.decks[deck].turntable.stop();
                }
            }
        };
        
        // Start from the adjusted offset
        this.decks[deck].source.start(0, this.decks[deck].startOffset);
        this.decks[deck].startTime = this.audioContext.currentTime - this.decks[deck].startOffset;
    }
    
    // End scratch effect
    endScratch(deck) {
        if (!this.scratchData[deck].isScratching) return;
        
        this.scratchData[deck].isScratching = false;
        
        // If it was playing before scratch, resume normal playback
        if (this.scratchData[deck].wasPlaying) {
            // First stop the current source
            if (this.decks[deck].source) {
                this.decks[deck].source.stop();
                this.decks[deck].source.disconnect();
            }
            
            // Create a new source
            this.decks[deck].source = this.audioContext.createBufferSource();
            this.decks[deck].source.buffer = this.decks[deck].buffer;
            
            // Restore original playback rate
            const pitchRate = 1.0 + (this.decks[deck].pitch / 100);
            this.decks[deck].source.playbackRate.value = 
                this.scratchData[deck].playbackRate || pitchRate;
            
            // Connect source to effect chain
            this.decks[deck].source.connect(this.decks[deck].lpFilter);
            
            // Set up callback for when track ends
            this.decks[deck].source.onended = () => {
                this.decks[deck].isPlaying = false;
                this.updatePlayButton(deck, false);
                if (this.decks[deck].turntable) {
                    this.decks[deck].turntable.stop();
                }
            };
            
            // Start from current position
            this.decks[deck].source.start(0, this.decks[deck].startOffset);
            this.decks[deck].startTime = this.audioContext.currentTime - this.decks[deck].startOffset;
            
            this.scratchData[deck].wasPlaying = false;
        } else {
            // If it wasn't playing, stop the temporary source we created for scratching
            if (this.decks[deck].source) {
                this.decks[deck].source.stop();
                this.decks[deck].source.disconnect();
                this.decks[deck].source = null;
            }
        }
        
        console.log(`Ended scratch on ${deck} deck at offset:`, this.decks[deck].startOffset);
    }
    
    // Set EQ for a deck
    setEQ(deck, type, value) {
        if (!this.decks[deck].isPoweredOn) return;
        
        // Convert value to gain (-15 to +15 dB range)
        const gainValue = value; // Value is already in dB range
        
        // Apply EQ settings based on type
        if (type === 'low') {
            // Apply to low pass filter
            this.decks[deck].lpFilter.gain.value = gainValue;
            this.decks[deck].filterLow = gainValue;
        } else if (type === 'high') {
            // Apply to high pass filter
            this.decks[deck].hpFilter.gain.value = gainValue;
            this.decks[deck].filterHigh = gainValue;
        } else if (type === 'mid') {
            // For mid control we could implement a band-pass filter if needed
            console.log(`Mid EQ control not fully implemented for ${deck} deck`);
        }
        
        // Update UI display
        this.updateEQDisplay(deck);
        
        console.log(`Set ${type} EQ for ${deck} deck to ${gainValue} dB`);
    }
    
    // Set pitch for a deck
    setPitch(deck, value) {
        if (!this.decks[deck].isPoweredOn) return;
        
        // Store the pitch value (-12 to +12 range)
        this.decks[deck].pitch = value;
        
        // If currently playing, update the playback rate
        if (this.decks[deck].isPlaying && this.decks[deck].source) {
            const pitchRate = 1.0 + (value / 100);
            this.decks[deck].source.playbackRate.value = pitchRate;
        }
        
        // Update UI to reflect pitch setting
        this.updatePitchDisplay(deck);
    }
    
    // Set volume for a deck
    setVolume(deck, value) {
        if (!this.decks[deck].isPoweredOn) return;
        
        // Store the volume value (0-1 range)
        this.decks[deck].volume = value;
        
        // Apply volume to the gain node
        this.decks[deck].gainNode.gain.value = value;
        
        // Apply crossfader setting
        this.updateCrossfader();
    }
    
    // Set crossfader position
    setCrossfader(value) {
        // Value is in range 0-1, where 0 is full left, 0.5 is center, 1 is full right
        this.crossfaderPosition = value;
        
        // Update the gain values for both decks based on crossfader position
        this.updateCrossfader();
    }
    
    // Update gain values based on crossfader position
    updateCrossfader() {
        // Calculate gain factors for each deck based on crossfader position
        const leftGain = this.decks.left.volume * (1 - this.crossfaderPosition);
        const rightGain = this.decks.right.volume * this.crossfaderPosition;
        
        // Apply to gain nodes if decks are powered on
        if (this.decks.left.isPoweredOn) {
            this.decks.left.gainNode.gain.value = leftGain;
        }
        
        if (this.decks.right.isPoweredOn) {
            this.decks.right.gainNode.gain.value = rightGain;
        }
        
        // Update UI visualization
        this.updateCrossfaderDisplay();
    }
    
    // Draw waveform visualization
    drawWaveform(deck) {
        const canvas = document.getElementById(`${deck}-visualizer`);
        if (!canvas || !this.decks[deck].analyser) return;
        
        const ctx = this.visualizers[deck];
        const analyser = this.decks[deck].analyser;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        // Get waveform data
        analyser.getByteTimeDomainData(dataArray);
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Set up drawing style
        ctx.lineWidth = 2;
        ctx.strokeStyle = this.decks[deck].isPlaying ? '#00CAFF' : '#666666';
        
        // Draw waveform
        ctx.beginPath();
        const sliceWidth = canvas.width / bufferLength;
        let x = 0;
        
        for (let i = 0; i < bufferLength; i++) {
            // Scale data to fit canvas
            const v = dataArray[i] / 128.0;
            const y = v * canvas.height / 2;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
            
            x += sliceWidth;
        }
        
        ctx.stroke();
    }
    
    // Draw frequency spectrum visualization
    drawSpectrum(deck) {
        const canvas = document.getElementById(`${deck}-visualizer`);
        if (!canvas || !this.decks[deck].analyser) return;
        
        const ctx = this.visualizers[deck];
        const analyser = this.decks[deck].analyser;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        // Get frequency data
        analyser.getByteFrequencyData(dataArray);
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Set up drawing style
        const barWidth = (canvas.width / bufferLength) * 2.5;
        let x = 0;
        
        // Draw frequency bars
        for (let i = 0; i < bufferLength; i++) {
            const barHeight = (dataArray[i] / 255) * canvas.height;
            
            // Create gradient for bars
            const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
            gradient.addColorStop(0, '#00CAFF');
            gradient.addColorStop(0.5, '#0088FF');
            gradient.addColorStop(1, '#D42F00');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            
            x += barWidth + 1;
            
            // Only draw a portion of the bars for performance
            if (x > canvas.width) break;
        }
    }
    
    // Run visualization loop
    drawVisualizer(deck) {
        // Choose visualization type based on current mode
        // For now, alternate between waveform and spectrum
        const now = Date.now();
        const visualizationType = (Math.floor(now / 5000) % 2 === 0) ? 'waveform' : 'spectrum';
        
        if (visualizationType === 'waveform') {
            this.drawWaveform(deck);
        } else {
            this.drawSpectrum(deck);
        }
        
        // Continue animation loop if the deck is powered on
        if (this.decks[deck].isPoweredOn) {
            requestAnimationFrame(() => this.drawVisualizer(deck));
        }
    }
    
    // Resize visualizers when window changes
    resizeVisualizers() {
        for (const deck of ['left', 'right']) {
            const canvas = document.getElementById(`${deck}-visualizer`);
            if (canvas && this.visualizers[deck]) {
                // Adjust canvas dimensions to match container
                canvas.width = canvas.clientWidth;
                canvas.height = canvas.clientHeight;
            }
        }
    }
    
    // Set master volume
    setMasterVolume(value) {
        // Update master volume value (0-1 range)
        this.masterVolume = value;
        
        // Apply to master gain node
        if (this.masterGain) {
            this.masterGain.gain.value = this.isMuted ? 0 : value;
        }
        
        // Update UI
        this.updateMasterVolumeDisplay();
    }
    
    // Toggle mute state
    toggleMute() {
        this.isMuted = !this.isMuted;
        
        // Apply to master gain node
        if (this.masterGain) {
            this.masterGain.gain.value = this.isMuted ? 0 : this.masterVolume;
        }
        
        // Update UI
        this.updateMuteDisplay();
    }
    
    // Update UI displays for controls
    updatePlayButton(deck, isPlaying) {
        const playButton = document.querySelector(`#${deck}-deck .play-button`);
        if (playButton) {
            playButton.classList.toggle('playing', isPlaying);
            playButton.innerHTML = isPlaying ? 
                '<i class="fas fa-pause"></i>' : 
                '<i class="fas fa-play"></i>';
        }
    }
    
    updatePitchDisplay(deck) {
        const pitchDisplay = document.querySelector(`#${deck}-deck .pitch-display`);
        if (pitchDisplay) {
            const pitch = this.decks[deck].pitch;
            pitchDisplay.textContent = `${pitch >= 0 ? '+' : ''}${pitch.toFixed(1)}%`;
        }
    }
    
    updateEQDisplay(deck) {
        const lowEQ = document.querySelector(`#${deck}-deck .eq-low-display`);
        const highEQ = document.querySelector(`#${deck}-deck .eq-high-display`);
        
        if (lowEQ) {
            lowEQ.textContent = `${this.decks[deck].filterLow >= 0 ? '+' : ''}${this.decks[deck].filterLow.toFixed(1)} dB`;
        }
        
        if (highEQ) {
            highEQ.textContent = `${this.decks[deck].filterHigh >= 0 ? '+' : ''}${this.decks[deck].filterHigh.toFixed(1)} dB`;
        }
    }
    
    updateCrossfaderDisplay() {
        const display = document.querySelector('.crossfader-display');
        if (display) {
            // Convert to percentage display
            const position = Math.round(this.crossfaderPosition * 100);
            
            if (position < 45) {
                display.textContent = `${100 - position * 2}% LEFT`;
            } else if (position > 55) {
                display.textContent = `${(position - 50) * 2}% RIGHT`;
            } else {
                display.textContent = 'CENTER';
            }
        }
    }
    
    updateMasterVolumeDisplay() {
        const display = document.querySelector('.master-volume-display');
        if (display) {
            // Convert to percentage
            display.textContent = `${Math.round(this.masterVolume * 100)}%`;
        }
    }
    
    updateMuteDisplay() {
        const muteButton = document.querySelector('.mute-button');
        if (muteButton) {
            muteButton.classList.toggle('muted', this.isMuted);
            muteButton.innerHTML = this.isMuted ? 
                '<i class="fas fa-volume-mute"></i>' : 
                '<i class="fas fa-volume-up"></i>';
        }
    }
    
    // Toggle play/pause for a deck
    togglePlay(deck) {
        if (!this.decks[deck].isPoweredOn) {
            console.warn(`Cannot play: deck ${deck} is not powered on.`);
            return;
        }
        
        if (this.decks[deck].isPlaying) {
            this.stop(deck);
        } else {
            this.play(deck);
        }
    }
    
    // Handle power change event from turntable
    handlePowerChange(deck, isOn) {
        console.log(`Power changed for ${deck} deck: ${isOn}`);
        
        // Update internal state
        this.decks[deck].isPoweredOn = isOn;
        
        // Start or stop visualizers based on power state
        if (isOn) {
            this.drawVisualizer(deck);
        }
    }
}
// Create and export the DJ Application instance
const djApp = new DJApplication();

// Initialize on DOM content loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Virtual Turntables application starting...');
    
    // Create a user interaction handler to ensure audio context starts
    document.body.addEventListener('click', function initAudioOnUserAction() {
        // Resume audio context if suspended
        if (djApp.audioContext && djApp.audioContext.state === 'suspended') {
            djApp.audioContext.resume().then(() => {
                console.log('AudioContext resumed successfully');
            });
        }
        // Remove the event listener after first interaction
        document.body.removeEventListener('click', initAudioOnUserAction);
    }, { once: true });
});

// Export for use in other modules
export { djApp as default };

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Kirk Radio DJ...');
    
    // Initialize audio system
    if (initializeAudio()) {
        // Initialize 3D turntables
        initializeTurntables();
        
        // Initialize UI components
        initializeUI();
        
        // Load any saved settings
        loadSettings();
        
        // Setup broadcast capabilities
        initializeBroadcast();

        showToast('Virtual Turntables initialized successfully', 'success');
    } else {
        showToast('Error initializing audio system', 'error');
    }
});

// Window resize handler
window.addEventListener('resize', () => {
    // Update turntable displays
    app.turntables.forEach(turntable => {
        if (turntable) {
            resizeTurntable(turntable);
        }
    });

    // Update waveforms
    app.decks.forEach((deck, index) => {
        if (deck.waveform) {
            updateWaveform(index);
        }
    });
});

// Handle visibility change
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Pause animations when tab is not visible
        app.turntables.forEach(turntable => {
            if (turntable) {
                turntable.isPlaying = false;
            }
        });
    } else {
        // Resume animations when tab becomes visible
        app.decks.forEach((deck, index) => {
            if (deck.playing && app.turntables[index]) {
                app.turntables[index].isPlaying = true;
            }
        });
    }
});

// Initialize UI components
function initializeUI() {
    // Set up deck controls
    app.decks.forEach((deck, index) => {
        // Initialize deck state
        deck.loaded = false;
        deck.playing = false;
        deck.scratching = false;
        deck.volume = 1.0;
        deck.tempo = 1.0;
    });
}

// Audio and Broadcast Controls for Virtual Turntables
let audioContext;
let micStream;
let micGainNode;
let broadcastStream;
let mediaRecorder;
let recordedChunks = [];
let isRecording = false;
let isBroadcasting = false;
let audioInputDevices = [];
let selectedMicId = null;
let recordingFormat = 'mp3'; // Default recording format
let recordingQuality = 'medium'; // Default quality (low, medium, high)

// Initialize audio context and setup
document.addEventListener('DOMContentLoaded', () => {
    initializeAudioContext();
    setupControlListeners();
    enumerateAudioDevices();
});

function initializeAudioContext() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log('Audio context initialized:', audioContext.state);
        
        // Create master gain node for the broadcast
        micGainNode = audioContext.createGain();
        micGainNode.gain.value = 0.8; // Default gain
        
        // Connect the master gain to the destination (speakers)
        micGainNode.connect(audioContext.destination);
        
    } catch (error) {
        console.error('Failed to initialize audio context:', error);
        showError('Failed to initialize audio system. Please check your browser compatibility.');
    }
}

// Setup event listeners for control buttons
function setupControlListeners() {
    // Mic Record button
    const micToggleBtn = document.getElementById('mic-toggle');
    if (micToggleBtn) {
        micToggleBtn.addEventListener('click', toggleMicRecording);
    }
    
    // Recording format selection
    const formatSelect = document.getElementById('recording-format');
    if (formatSelect) {
        formatSelect.addEventListener('change', (e) => {
            recordingFormat = e.target.value;
            console.log(`Recording format set to ${recordingFormat}`);
        });
    }
    
    // Recording quality selection
    const qualitySelect = document.getElementById('recording-quality');
    if (qualitySelect) {
        qualitySelect.addEventListener('change', (e) => {
            recordingQuality = e.target.value;
            console.log(`Recording quality set to ${recordingQuality}`);
        });
    }
    
    // Broadcast ON AIR button
    const broadcastToggleBtn = document.getElementById('broadcast-toggle');
    if (broadcastToggleBtn) {
        broadcastToggleBtn.addEventListener('click', toggleBroadcast);
    }
    
    // Mic input select
    const micSelectDropdown = document.getElementById('mic-select');
    if (micSelectDropdown) {
        micSelectDropdown.addEventListener('change', (e) => {
            selectedMicId = e.target.value;
            if (isRecording) {
                stopMicRecording().then(() => startMicRecording());
            }
        });
    }
    
    // Mic volume control
    const micVolumeSlider = document.getElementById('mic-volume');
    if (micVolumeSlider) {
        micVolumeSlider.addEventListener('input', (e) => {
            if (micGainNode) {
                micGainNode.gain.value = parseFloat(e.target.value);
            }
        });
    }
}

// Toggle microphone recording on/off
async function toggleMicRecording() {
    if (!isRecording) {
        await startMicRecording();
    } else {
        await stopMicRecording();
    }
}

// Start recording from microphone
async function startMicRecording() {
    try {
        // Resume audio context if suspended
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }
        
        // Get user media
        const constraints = {
            audio: selectedMicId ? { deviceId: { exact: selectedMicId } } : true
        };
        
        micStream = await navigator.mediaDevices.getUserMedia(constraints);
        const micSource = audioContext.createMediaStreamSource(micStream);
        
        // Connect mic to gain node
        micSource.connect(micGainNode);
        
        // Setup media recorder for saving audio with selected format and quality
        const recordingStream = micGainNode.stream;
        if (recordingStream) {
            // Set recorder options based on selected format and quality
            const recorderOptions = getRecorderOptions(recordingFormat, recordingQuality);
            
            try {
                mediaRecorder = new MediaRecorder(recordingStream, recorderOptions);
                
                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        recordedChunks.push(event.data);
                    }
                };
                
                mediaRecorder.onstop = saveRecording;
                mediaRecorder.start();
                
                console.log(`Recording started with format: ${recordingFormat}, quality: ${recordingQuality}`);
            } catch (error) {
                console.error('MediaRecorder error:', error);
                // Fallback to default WebM format if the selected format is not supported
                try {
                    console.log('Falling back to WebM format');
                    mediaRecorder = new MediaRecorder(recordingStream, { mimeType: 'audio/webm' });
                    
                    mediaRecorder.ondataavailable = (event) => {
                        if (event.data.size > 0) {
                            recordedChunks.push(event.data);
                        }
                    };
                    
                    mediaRecorder.onstop = saveRecording;
                    mediaRecorder.start();
                } catch (fallbackError) {
                    console.error('Fallback MediaRecorder error:', fallbackError);
                    showError('Recording is not supported in this browser');
                }
            }
        }
        
        isRecording = true;
        updateMicButtonState(true);
        
        // Start audio level monitoring
        startLevelMonitoring(micSource);
        
    } catch (error) {
        console.error('Error starting microphone recording:', error);
        showError('Could not access microphone. Please check permissions and try again.');
    }
}

// Stop microphone recording
async function stopMicRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
    
    if (micStream) {
        micStream.getTracks().forEach(track => track.stop());
        micStream = null;
    }
    
    isRecording = false;
    updateMicButtonState(false);
    stopLevelMonitoring();
}

// Get MediaRecorder options based on format and quality
function getRecorderOptions(format, quality) {
    let mimeType;
    let audioBitsPerSecond;
    
    // Set mime type based on format
    switch (format) {
        case 'mp3':
            mimeType = 'audio/mpeg';
            break;
        case 'wav':
            mimeType = 'audio/wav';
            break;
        default:
            mimeType = 'audio/webm';
    }
    
    // Set bitrate based on quality
    switch (quality) {
        case 'low':
            audioBitsPerSecond = 96000; // 96 kbps
            break;
        case 'high':
            audioBitsPerSecond = 320000; // 320 kbps
            break;
        case 'medium':
        default:
            audioBitsPerSecond = 192000; // 192 kbps
    }
    
    return {
        mimeType: mimeType,
        audioBitsPerSecond: audioBitsPerSecond
    };
}

// Get the file extension based on format
function getFileExtension(format) {
    switch (format) {
        case 'mp3':
            return 'mp3';
        case 'wav':
            return 'wav';
        default:
            return 'webm';
    }
}

// Create a formatted filename with timestamp
function createFormattedFilename() {
    const now = new Date();
    const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const time = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
    const extension = getFileExtension(recordingFormat);
    
    return `KirkRadio_DJ_Session_${date}_${time}.${extension}`;
}

// Save the recorded audio
function saveRecording() {
    if (recordedChunks.length === 0) return;
    
    // Determine the correct mime type for the blob
    let blobType;
    switch (recordingFormat) {
        case 'mp3':
            blobType = 'audio/mpeg';
            break;
        case 'wav':
            blobType = 'audio/wav';
            break;
        default:
            blobType = 'audio/webm';
    }
    
    const blob = new Blob(recordedChunks, { type: blobType });
    recordedChunks = [];
    
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = createFormattedFilename();
    
    // Add to recordings list or trigger download
    const recordingsList = document.getElementById('recordings-list');
    if (recordingsList) {
        const listItem = document.createElement('li');
        listItem.classList.add('recording-item');
        const recordingName = document.createElement('span');
        recordingName.textContent = downloadLink.download;
        
        // Add format and quality information
        const recordingInfo = document.createElement('span');
        recordingInfo.classList.add('recording-info');
        recordingInfo.textContent = `${recordingFormat.toUpperCase()} | ${recordingQuality} quality`;
        
        const downloadBtn = document.createElement('button');
        downloadBtn.textContent = 'Download';
        downloadBtn.classList.add('download-btn');
        downloadBtn.addEventListener('click', () => {
            downloadLink.click();
            downloadLink.click();
        });
        const playBtn = document.createElement('button');
        playBtn.textContent = 'Play';
        playBtn.classList.add('play-btn');
        playBtn.addEventListener('click', () => {
            const audio = new Audio(url);
            audio.play();
        });
        listItem.appendChild(recordingName);
        listItem.appendChild(recordingInfo);
        listItem.appendChild(playBtn);
        listItem.appendChild(downloadBtn);
        recordingsList.appendChild(listItem);
    } else {
        // Direct download if no list is found
        downloadLink.click();
    }
    
    URL.revokeObjectURL(url);
}

// Toggle broadcast on/off
async function toggleBroadcast() {
    if (!isBroadcasting) {
        await startBroadcast();
    } else {
        stopBroadcast();
    }
}

// Start broadcasting
async function startBroadcast() {
    try {
        // Check if broadcast settings are valid
        if (!validateBroadcastSettings()) {
            showError('Invalid broadcast settings. Please check your configuration.');
            return;
        }
        
        // If mic is not active, start it
        if (!isRecording) {
            await startMicRecording();
        }
        
        // Get broadcast settings
        const server = document.getElementById('broadcast-server').value;
        const port = document.getElementById('broadcast-port').value;
        const mountPoint = document.getElementById('broadcast-mount').value;
        const streamKey = document.getElementById('broadcast-key').value;
        
        // Create broadcast stream from gain node output
        if (micGainNode) {
            broadcastStream = micGainNode.stream;
            
            // Connect to Icecast server (implementation depends on your streaming library)
            // This is a placeholder - actual implementation will depend on how you're connecting to Icecast
            const broadcastResult = await connectToIcecast(server, port, mountPoint, streamKey, broadcastStream);
            
            if (broadcastResult.success) {
                isBroadcasting = true;
                updateBroadcastButtonState(true);
                
                // Flash the ON AIR sign
                startOnAirFlashing();
            } else {
                showError(`Broadcast connection failed: ${broadcastResult.error}`);
            }
        } else {
            showError('Audio system not initialized properly.');
        }
        
    } catch (error) {
        console.error('Error starting broadcast:', error);
        showError('Failed to start broadcast. Please check your settings and try again.');
    }
}

// Stop broadcasting
function stopBroadcast() {
    if (broadcastStream) {
        // Disconnect from Icecast server (implementation depends on your streaming library)
        disconnectFromIcecast();
        
        broadcastStream = null;
    }
    
    isBroadcasting = false;
    updateBroadcastButtonState(false);
    stopOnAirFlashing();
}

// Connect to Icecast (placeholder - implement with your streaming library)
async function connectToIcecast(server, port, mountPoint, streamKey, stream) {
    // This is a placeholder function - implementation will depend on 
    // how you're connecting to Icecast (e.g., using Icecast-metadata-js, WebRTC, or another library)
    
    try {
        console.log(`Connecting to Icecast: ${server}:${port}${mountPoint}`);
        
        // Placeholder for actual Icecast connection code
        // e.g.: const connection = await IcecastStreamer.connect({...});
        
        return { success: true };
    } catch (error) {
        console.error('Icecast connection error:', error);
        return { success: false, error: error.message };
    }
}

// Disconnect from Icecast (placeholder)
function disconnectFromIcecast() {
    console.log('Disconnecting from Icecast server');
    // Implementation will depend on how you're connecting to Icecast
}

// Validate broadcast settings
function validateBroadcastSettings() {
    const server = document.getElementById('broadcast-server').value;
    const port = document.getElementById('broadcast-port').value;
    const mountPoint = document.getElementById('broadcast-mount').value;
    
    if (!server || !port || !mountPoint) {
        return false;
    }
    
    // Validate server URL format
    if (!server.match(/^(https?:\/\/)?([a-zA-Z0-9][-a-zA-Z0-9]*(\.[a-zA-Z0-9][-a-zA-Z0-9]*)+)$/)) {
        return false;
    }
    
    // Validate port number
    if (isNaN(parseInt(port)) || parseInt(port) <= 0 || parseInt(port) > 65535) {
        return false;
    }
    
    return true;
}

// Update mic button state and visual indicator
function updateMicButtonState(isActive) {
    const micToggleBtn = document.getElementById('mic-toggle');
    const micIndicator = document.getElementById('mic-indicator');
    
    if (micToggleBtn) {
        micToggleBtn.classList.toggle('active', isActive);
        micToggleBtn.textContent = isActive ? 'Mic: ON' : 'Mic: OFF';
    }
    
    if (micIndicator) {
        micIndicator.classList.toggle('active', isActive);
    }
}

// Update broadcast button state and visual indicator
function updateBroadcastButtonState(isActive) {
    const broadcastToggleBtn = document.getElementById('broadcast-toggle');
    const onAirSign = document.getElementById('on-air-sign');
    
    if (broadcastToggleBtn) {
        broadcastToggleBtn.classList.toggle('active', isActive);
        broadcastToggleBtn.textContent = isActive ? 'ON AIR: LIVE' : 'ON AIR: OFF';
    }
    
    if (onAirSign) {
        onAirSign.classList.toggle('active', isActive);
    }
}

// Flash the ON AIR sign when broadcasting
let onAirFlashInterval;
function startOnAirFlashing() {
    const onAirSign = document.getElementById('on-air-sign');
    if (!onAirSign) return;
    
    // Clear any existing interval
    if (onAirFlashInterval) {
        clearInterval(onAirFlashInterval);
    }
    
    // Make sure the sign is active
    onAirSign.classList.add('active');
    
    // Start flashing effect
    let isFlashing = true;
    onAirFlashInterval = setInterval(() => {
        isFlashing = !isFlashing;
        onAirSign.classList.toggle('flashing', isFlashing);
    }, 1000); // Flash every second
}

// Stop flashing the ON AIR sign
function stopOnAirFlashing() {
    if (onAirFlashInterval) {
        clearInterval(onAirFlashInterval);
        onAirFlashInterval = null;
    }
    
    const onAirSign = document.getElementById('on-air-sign');
    if (onAirSign) {
        onAirSign.classList.remove('active', 'flashing');
    }
}

// Enumerate available audio input devices
async function enumerateAudioDevices() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        audioInputDevices = devices.filter(device => device.kind === 'audioinput');
        
        const micSelectDropdown = document.getElementById('mic-select');
        if (micSelectDropdown) {
            // Clear existing options
            micSelectDropdown.innerHTML = '';
            
            // Add default option
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Default Microphone';
            micSelectDropdown.appendChild(defaultOption);
            
            // Add each device
            audioInputDevices.forEach(device => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.textContent = device.label || `Microphone ${audioInputDevices.indexOf(device) + 1}`;
                micSelectDropdown.appendChild(option);
            });
        }
        
    } catch (error) {
        console.error('Error enumerating audio devices:', error);
    }
}

// Audio level monitoring for VU meter
let levelAnalyser;
let levelDataArray;
let levelAnimationFrame;

function startLevelMonitoring(audioSource) {
    if (!audioContext) return;
    
    // Create analyzer for level monitoring
    levelAnalyser = audioContext.createAnalyser();
    levelAnalyser.fftSize = 256;
    
    // Connect audio source to analyzer
    audioSource.connect(levelAnalyser);
    
    // Create array for analysis data
    levelDataArray = new Uint8Array(levelAnalyser.frequencyBinCount);
    
    // Start update loop for VU meter
    updateLevelMeter();
}

function updateLevelMeter() {
    if (!levelAnalyser) return;
    
    levelAnalyser.getByteFrequencyData(levelDataArray);
    
    // Calculate average level
    let sum = 0;
    for (let i = 0; i < levelDataArray.length; i++) {
        sum += levelDataArray[i];
    }
    const average = sum / levelDataArray.length;
    
    // Update VU meter elements
    updateVUMeter('mic-level-meter', average);
    
    // If broadcasting, also update broadcast level meter
    if (isBroadcasting) {
        updateVUMeter('broadcast-level-meter', average);
    }
    
    // Request next animation frame
    levelAnimationFrame = requestAnimationFrame(updateLevelMeter);
}
