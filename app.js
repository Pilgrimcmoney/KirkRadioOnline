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
        });
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

