document.addEventListener('DOMContentLoaded', () => {
    const loader = new EmulatorLoader();
    const fileInput = document.getElementById('rom-file');
    const uploadBtn = document.getElementById('upload-btn');
    const systemSelector = document.getElementById('system-selector');
    const romGrid = document.getElementById('rom-grid');

    // ROM Upload Handler
    uploadBtn.addEventListener('click', () => {
        const files = fileInput.files;
        const selectedSystem = systemSelector.value;

        Array.from(files).forEach(file => {
            // Create ROM card in grid
            const romCard = createROMCard(file, selectedSystem);
            romGrid.appendChild(romCard);
        });
    });

    function createROMCard(file, system) {
        const card = document.createElement('div');
        card.className = 'rom-card';
        card.innerHTML = `
            <img src="placeholder-rom-image.png" alt="${file.name}">
            <h5>${file.name}</h5>
            <button class="btn btn-success play-btn">Play</button>
        `;

        const playBtn = card.querySelector('.play-btn');
        playBtn.addEventListener('click', () => {
            loader.startGame(file, system);
            
            // Show emulator modal
            const emulatorModal = new bootstrap.Modal(document.getElementById('emulator-modal'));
            emulatorModal.show();
        });

        return card;
    }
});
