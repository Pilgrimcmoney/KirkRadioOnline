// Kirk Radio DJ - Configuration Module
// Application settings and configuration

const CONFIG = {
    // Audio settings
    audio: {
        sampleRate: 44100,
        bufferSize: 1024,
        latencyHint: 'interactive',
        channels: 2
    },

    // Turntable settings
    turntable: {
        defaultSpeed: 33.33, // RPM
        pitchRange: 8, // Percentage
        startupTime: 0.5, // Seconds
        stopTime: 1.0 // Seconds
    },

    // Effect defaults
    effects: {
        reverb: {
            wetDry: 0.5,
            decay: 2.0,
            preDelay: 0.01
        },
        delay: {
            time: 0.5,
            feedback: 0.4,
            wetDry: 0.5
        },
        filter: {
            frequency: 1000,
            Q: 1,
            gain: 0
        },
        flanger: {
            delay: 0.005,
            depth: 0.002,
            rate: 0.25,
            wetDry: 0.5
        }
    },

    // EQ settings
    eq: {
        low: {
            frequency: 320,
            gain: 0,
            Q: 0.7
        },
        mid: {
            frequency: 1000,
            gain: 0,
            Q: 0.7
        },
        high: {
            frequency: 3200,
            gain: 0,
            Q: 0.7
        }
    },

    // OAuth client IDs for music services
    oauth: {
        googleDrive: {
            clientId: '{{GOOGLE_CLIENT_ID}}',
            scope: 'https://www.googleapis.com/auth/drive.readonly'
        },
        oneDrive: {
            clientId: '{{ONEDRIVE_CLIENT_ID}}',
            scope: 'files.read'
        },
        spotify: {
            clientId: '{{SPOTIFY_CLIENT_ID}}',
            scope: 'streaming user-read-email user-read-private'
        },
        youtube: {
            clientId: '{{YOUTUBE_CLIENT_ID}}',
            scope: 'https://www.googleapis.com/auth/youtube.readonly'
        },
        soundCloud: {
            clientId: '{{SOUNDCLOUD_CLIENT_ID}}',
            scope: 'non-expiring'
        }
    },

    // Broadcast settings
    broadcast: {
        defaultFormat: 'mp3',
        defaultBitrate: 128,
        defaultSampleRate: 44100,
        icecast: {
            defaultPort: 8000,
            defaultMount: '/live'
        }
    },

    // UI settings
    ui: {
        waveform: {
            width: 400,
            height: 100,
            color: '#D42F00',
            backgroundColor: 'rgba(26, 26, 26, 0.8)'
        },
        toast: {
            duration: 3000,
            position: 'bottom-right'
        },
        animations: {
            enabled: true,
            duration: 300
        }
    },

    // Debug settings
    debug: {
        enabled: false,
        logLevel: 'warn'
    }
};

// Storage keys for settings
const STORAGE_KEYS = {
    SETTINGS: 'kirkRadioDJ_settings',
    AUTH_TOKENS: 'kirkRadioDJ_auth',
    RECENT_TRACKS: 'kirkRadioDJ_recent',
    PLAYLISTS: 'kirkRadioDJ_playlists'
};

// Default application settings
const defaultSettings = {
    audio: CONFIG.audio,
    effects: CONFIG.effects,
    eq: CONFIG.eq,
    ui: CONFIG.ui
};

// Load saved settings or use defaults
function loadSettings() {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        return saved ? {...defaultSettings, ...JSON.parse(saved)} : defaultSettings;
    } catch (error) {
        console.error('Error loading settings:', error);
        return defaultSettings;
    }
}

// Save settings
function saveSettings(settings) {
    try {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
        return true;
    } catch (error) {
        console.error('Error saving settings:', error);
        return false;
    }
}

// Export configuration
window.CONFIG = CONFIG;
window.STORAGE_KEYS = STORAGE_KEYS;
window.loadSettings = loadSettings;
window.saveSettings = saveSettings;

