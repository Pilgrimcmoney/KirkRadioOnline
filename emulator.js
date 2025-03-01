class RetroEmulator {
    constructor() {
        // Core configuration
        this.config = {
            systems: {
                'nes': {
                    core: 'nes',
                    extensions: ['.nes']
                },
                'snes': {
                    core: 'snes',
                    extensions: ['.smc', '.sfc']
                },
                'gba': {
                    core: 'gba',
                    extensions: ['.gba', '.gb']
                }
            },
            maxFileSize: 50 * 1024 * 1024 // 50MB
        };

        // DOM Elements
        this.elements = {
            systemSelector: document.getElementById('system-selector'),
            romFileInput: document.getElementById('rom-file'),
            loadGameBtn: document.getElementById('load-game-btn'),
            emulatorContainer: document.getElementById('emulator-container'),
            errorDisplay: document.getElementById('error-display')
        };

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.elements.loadGameBtn.addEventListener('click', () => this.initializeGame());
    }

    validateROM(file, system) {
        // File type validation
        const allowedExtensions = this.config.systems[system].extensions;
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();

        if (!allowedExtensions.includes(fileExtension)) {
            throw new Error(`Invalid ROM type. Allowed: ${allowedExtensions.join(', ')}`);
        }

        // File size validation
        if (file.size > this.config.maxFileSize) {
            throw new Error('ROM file exceeds maximum size (50MB)');
        }
    }

    async readROMBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const buffer = event.target.result;
                if (buffer instanceof ArrayBuffer) {
                    resolve(buffer);
                } else {
                    reject(new Error('Failed to read ROM file'));
                }
            };
            reader.onerror = (error) => reject(error);
            reader.readAsArrayBuffer(file);
        });
    }

    initializeGame() {
        try {
            // Get selected system and file
            const system = this.elements.systemSelector.value;
            const file = this.elements.romFileInput.files[0];

            // Validate ROM
            this.validateROM(file, system);

            // Read ROM file
            this.readROMBuffer(file)
                .then(buffer => this.loadEmulator(system, buffer))
                .catch(this.handleError.bind(this));

        } catch (error) {
            this.handleError(error);
        }
    }

    loadEmulator(system, romBuffer) {
        // Clear previous emulator
        this.elements.emulatorContainer.innerHTML = '';

        // Global EmulatorJS Configuration
        window.EJS_player = '#emulator-container';
        window.EJS_core = this.config.systems[system].core;
        window.EJS_loadedROM = romBuffer;
        
        // Additional EmulatorJS Settings
        window.EJS_pathtodata = 'https://cdn.jsdelivr.net/npm/emulatorjs@latest/data/';
        window.EJS_startOnLoaded = true;
        window.EJS_defaultControls = true;
        window.EJS_fullscreenOnLoaded = true;

        // Initialize Emulator
        try {
            // Use loader to initialize
            EJS_loader(EJS_player);
        } catch (error) {
            this.handleError(error);
        }
    }

    handleError(error) {
        console.error('Emulator Error:', error);
        
        // Display error message
        this.elements.errorDisplay.textContent = error.message;
        this.elements.errorDisplay.style.display = 'block';
    }
}

// Initialize Emulator on DOM Load
document.addEventListener('DOMContentLoaded', () => {
    new RetroEmulator();
});
