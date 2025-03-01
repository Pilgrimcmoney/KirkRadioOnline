class RetroEmulatorV2 {
    constructor() {
        // Comprehensive System Configuration
        this.systemConfig = {
            'nes': {
                core: 'nes',
                extensions: ['.nes'],
                path: 'https://cdn.jsdelivr.net/npm/emulatorjs@latest/data/nes.data'
            },
            'snes': {
                core: 'snes',
                extensions: ['.smc', '.sfc'],
                path: 'https://cdn.jsdelivr.net/npm/emulatorjs@latest/data/snes.data'
            },
            'gba': {
                core: 'gba',
                extensions: ['.gba', '.gb'],
                path: 'https://cdn.jsdelivr.net/npm/emulatorjs@latest/data/gba.data'
            }
        };

        // DOM Element References
        this.elements = {
            systemSelector: document.getElementById('system-selector'),
            romFileInput: document.getElementById('rom-file'),
            loadGameBtn: document.getElementById('load-game-btn'),
            gameContainer: document.getElementById('game-container'),
            errorDisplay: document.getElementById('error-display')
        };

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        this.elements.loadGameBtn.addEventListener('click', () => this.startGameEmulation());
    }

    validateROMFile(file, system) {
        // Comprehensive ROM Validation
        if (!file) {
            throw new Error('No ROM file selected');
        }

        const allowedExtensions = this.systemConfig[system].extensions;
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();

        if (!allowedExtensions.includes(fileExtension)) {
            throw new Error(`Invalid ROM type for ${system}. Allowed: ${allowedExtensions.join(', ')}`);
        }

        // File size check (50MB limit)
        const maxFileSize = 50 * 1024 * 1024;
        if (file.size > maxFileSize) {
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

    startGameEmulation() {
        try {
            // Get selected system and ROM file
            const system = this.elements.systemSelector.value;
            const file = this.elements.romFileInput.files[0];

            // Validate ROM
            this.validateROMFile(file, system);

            // Read ROM and initialize emulation
            this.readROMBuffer(file)
                .then(buffer => this.initializeEmulator(system, buffer))
                .catch(this.handleError.bind(this));

        } catch (error) {
            this.handleError(error);
        }
    }

    initializeEmulator(system, romBuffer) {
        // Clear previous emulator content
        this.elements.gameContainer.innerHTML = '';

        // Detailed EmulatorJS Configuration
        window.EJS_player = '#game-container';
        window.EJS_core = this.systemConfig[system].core;
        window.EJS_gameName = 'Retro Game';
        window.EJS_color = '#00ff00';  // Optional: Customize color

        // ROM and Data Paths
        window.EJS_pathtodata = 'https://cdn.jsdelivr.net/npm/emulatorjs@latest/data/';
        window.EJS_loadedROM = romBuffer;

        // Emulator Behavior Settings
        window.EJS_startOnLoaded = true;
        window.EJS_defaultControls = true;
        window.EJS_fullscreenOnLoaded = true;
        window.EJS_saveStatesSupported = true;

        try {
            // Direct Emulator Initialization
            const emulator = new EmulatorJS(window.EJS_player);
        } catch (error) {
            this.handleError(error);
        }
    }

    handleError(error) {
        console.error('Emulation Error:', error);
        
        // User-friendly error display
        this.elements.errorDisplay.innerHTML = `
            <strong>Emulation Error:</strong>
            <p>${error.message}</p>
            <ul>
                <li>Verify ROM file</li>
                <li>Check system selection</li>
                <li>Ensure file compatibility</li>
            </ul>
        `;
        this.elements.errorDisplay.style.display = 'block';
    }
}

// Initialize Emulator on DOM Load
document.addEventListener('DOMContentLoaded', () => {
    new RetroEmulatorV2();
});
