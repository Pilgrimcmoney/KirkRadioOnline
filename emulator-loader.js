class EmulatorLoader {
    constructor() {
        this.rom = null;
        this.emulator = null;
        this.errorDisplay = document.getElementById('error-message');
    }

    async loadROM(file) {
        try {
            if (!file) throw new Error('No file selected');

            const reader = new FileReader();
            return new Promise((resolve, reject) => {
                reader.onload = (event) => {
                    const arrayBuffer = event.target.result;
                    if (!(arrayBuffer instanceof ArrayBuffer)) {
                        reject(new Error('Invalid file format'));
                        return;
                    }
                    this.rom = arrayBuffer;
                    resolve(arrayBuffer);
                };

                reader.onerror = (error) => {
                    reject(new Error('File reading error: ' + error));
                };

                reader.readAsArrayBuffer(file);
            });
        } catch (error) {
            this.handleError(error);
            throw error;
        }
    }

    initializeEmulator(system) {
        try {
            if (!this.rom) throw new Error('ROM not loaded');

            // EmulatorJS specific initialization
            EJS_player = '#emulator-container';
            EJS_core = system; // 'nes', 'snes', etc.
            EJS_loadedROM = this.rom;

            // Additional configuration
            EJS_startOnLoaded = true;
            EJS_fullscreenOnLoaded = true;

            // Initialize emulator
            new EmulatorJS(EJS_player);
        } catch (error) {
            this.handleError(error);
        }
    }

    async startGame(file, system) {
        try {
            await this.loadROM(file);
            this.initializeEmulator(system);
        } catch (error) {
            this.handleError(error);
        }
    }

    handleError(error) {
        console.error('Game Loading Failed:', error);
        
        if (this.errorDisplay) {
            this.errorDisplay.textContent = `Unable to load game: ${error.message}`;
            this.errorDisplay.style.display = 'block';
        }
    }
}
