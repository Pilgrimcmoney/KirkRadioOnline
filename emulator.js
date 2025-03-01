class SafeEmulatorManager {
    constructor() {
        // Safe Element Selection with Fallback
        this.elements = {
            systemSelector: this.safeSelect('#system-selector'),
            romFileInput: this.safeSelect('#rom-file'),
            loadGameBtn: this.safeSelect('#load-game-btn'),
            gameContainer: this.safeSelect('#game-container'),
            errorDisplay: this.safeSelect('#error-display')
        };

        // Validate all critical elements
        this.validateElements();

        // System Configuration
        this.systemConfig = {
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
        };

        // Initialize Event Listeners
        this.initializeEventListeners();
    }

    // Safe Element Selection
    safeSelect(selector) {
        const element = document.querySelector(selector);
        if (!element) {
            console.warn(`Element not found: ${selector}`);
        }
        return element;
    }

    // Validate Critical Elements
    validateElements() {
        const missingElements = Object.entries(this.elements)
            .filter(([key, element]) => !element)
            .map(([key]) => key);

        if (missingElements.length > 0) {
            throw new Error(`Missing critical elements: ${missingElements.join(', ')}`);
        }
    }

    // Event Listener Setup with Null Checking
    initializeEventListeners() {
        if (this.elements.loadGameBtn) {
            this.elements.loadGameBtn.addEventListener('click', () => {
                try {
                    this.startGameEmulation();
                } catch (error) {
                    this.handleError(error);
                }
            });
        }
    }

    // Comprehensive ROM Validation
    validateROMFile(file, system) {
        // Null and type checking
        if (!file) {
            throw new Error('No ROM file selected');
        }

        // System validation
        if (!this.systemConfig[system]) {
            throw new Error(`Unsupported system: ${system}`);
        }

        const allowedExtensions = this.systemConfig[system].extensions;
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();

        // Extension validation
        if (!allowedExtensions.includes(fileExtension)) {
            throw new Error(`Invalid ROM type for ${system}. Allowed: ${allowedExtensions.join(', ')}`);
        }

        // File size check
        const maxFileSize = 50 * 1024 * 1024; // 50MB
        if (file.size > maxFileSize) {
            throw new Error('ROM file exceeds maximum size (50MB)');
        }
    }

    // Safe ROM Buffer Reading
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

            reader.onerror = (error) => {
                reject(new Error('ROM file reading error'));
            };

            reader.readAsArrayBuffer(file);
        });
    }

    // Game Emulation Initialization
    startGameEmulation() {
        // Null-safe method calls
        const system = this.elements.systemSelector?.value;
        const file = this.elements.romFileInput?.files?.[0];

        if (!system || !file) {
            throw new Error('Please select a system and ROM file');
        }

        // Validate ROM
        this.validateROMFile(file, system);

        // Read and initialize
        this.readROMBuffer(file)
            .then(buffer => this.initializeEmulator(system, buffer))
            .catch(this.handleError.bind(this));
    }

    // Emulator Initialization with Robust Configuration
    initializeEmulator(system, romBuffer) {
        // Null-safe container clearing
        if (this.elements.gameContainer) {
            this.elements.gameContainer.innerHTML = '';
        }

        // Global EmulatorJS Configuration
        window.EJS_player = '#game-container';
        window.EJS_core = this.systemConfig[system].core;
        window.EJS_loadedROM = romBuffer;

        // Additional Configuration
        window.EJS_pathtodata = 'https://cdn.jsdelivr.net/npm/emulatorjs@latest/data/';
        window.EJS_startOnLoaded = true;
        window.EJS_defaultControls = true;
        window.EJS_fullscreenOnLoaded = true;

        try {
            // Safe Emulator Initialization
            new EmulatorJS(window.EJS_player);
        } catch (error) {
            this.handleError(error);
        }
    }

    // Centralized Error Handling
    handleError(error) {
        console.error('Emulation Error:', error);

        // Null-safe error display
        if (this.elements.errorDisplay) {
            this.elements.errorDisplay.textContent = error.message;
            this.elements.errorDisplay.style.display = 'block';
        } else {
            // Fallback error logging
            alert(`Emulation Error: ${error.message}`);
        }
    }
}

// Safe Initialization
document.addEventListener('DOMContentLoaded', () => {
    try {
        new SafeEmulatorManager();
    } catch (initError) {
        console.error('Initialization Error:', initError);
        alert('Failed to initialize emulator. Check console for details.');
    }
});
