// Kirk Radio DJ - Effects Module
// Handles audio effects and processing

// Effect types
const EFFECT_TYPES = {
    REVERB: 'reverb',
    DELAY: 'delay',
    FILTER: 'filter',
    FLANGER: 'flanger'
};

// Initialize effects for a deck
function initializeEffects(deckIndex) {
    const deck = app.decks[deckIndex];
    if (!deck.effects) {
        deck.effects = {
            // EQ
            lowEQ: audioContext.createBiquadFilter(),
            midEQ: audioContext.createBiquadFilter(),
            highEQ: audioContext.createBiquadFilter(),
            
            // Effects
            reverb: null,
            delay: null,
            filter: null,
            flanger: null,
            
            // Effect settings
            settings: {
                reverb: { wet: 0.5, decay: 2.0 },
                delay: { time: 0.5, feedback: 0.4, wet: 0.5 },
                filter: { frequency: 1000, Q: 1, gain: 0 },
                flanger: { delay: 0.005, depth: 0.002, rate: 0.25, wet: 0.5 }
            }
        };

        // Configure EQ
        deck.effects.lowEQ.type = 'lowshelf';
        deck.effects.lowEQ.frequency.value = 320;
        deck.effects.lowEQ.gain.value = 0;

        deck.effects.midEQ.type = 'peaking';
        deck.effects.midEQ.frequency.value = 1000;
        deck.effects.midEQ.Q.value = 1;
        deck.effects.midEQ.gain.value = 0;

        deck.effects.highEQ.type = 'highshelf';
        deck.effects.highEQ.frequency.value = 3200;
        deck.effects.highEQ.gain.value = 0;

        // Connect EQ chain
        if (deck.gainNode) {
            deck.gainNode.connect(deck.effects.lowEQ);
            deck.effects.lowEQ.connect(deck.effects.midEQ);
            deck.effects.midEQ.connect(deck.effects.highEQ);
            deck.effects.highEQ.connect(audioContext.destination);
        }
    }
}

// Update EQ settings
function updateEQ(deckIndex, band, value) {
    const deck = app.decks[deckIndex];
    if (!deck.effects) return;

    const gain = (value - 50) * 0.24; // Convert 0-100 to -12/+12 dB
    
    switch (band) {
        case 'low':
            deck.effects.lowEQ.gain.value = gain;
            break;
        case 'mid':
            deck.effects.midEQ.gain.value = gain;
            break;
        case 'high':
            deck.effects.highEQ.gain.value = gain;
            break;
    }
}

// Toggle effect
function toggleEffect(deckIndex, effectType) {
    const deck = app.decks[deckIndex];
    if (!deck.effects) return;

    const effect = deck.effects[effectType];
    if (effect) {
        // Disable effect
        disconnectEffect(deckIndex, effectType);
        deck.effects[effectType] = null;
        showToast(`${effectType} disabled for Deck ${deckIndex + 1}`, 'info');
    } else {
        // Enable effect
        createEffect(deckIndex, effectType);
        showToast(`${effectType} enabled for Deck ${deckIndex + 1}`, 'success');
    }

    // Update UI
    updateEffectButton(deckIndex, effectType, !!deck.effects[effectType]);
}

// Create audio effect
function createEffect(deckIndex, effectType) {
    const deck = app.decks[deckIndex];
    if (!deck.effects) return;

    switch (effectType) {
        case EFFECT_TYPES.REVERB:
            createReverb(deckIndex);
            break;
        case EFFECT_TYPES.DELAY:
            createDelay(deckIndex);
            break;
        case EFFECT_TYPES.FILTER:
            createFilter(deckIndex);
            break;
        case EFFECT_TYPES.FLANGER:
            createFlanger(deckIndex);
            break;
    }
}

// Create reverb effect
function createReverb(deckIndex) {
    const deck = app.decks[deckIndex];
    const settings = deck.effects.settings.reverb;
    
    // Create convolver node
    deck.effects.reverb = audioContext.createConvolver();
    
    // Generate impulse response
    const length = audioContext.sampleRate * settings.decay;
    const impulse = audioContext.createBuffer(2, length, audioContext.sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
        const channelData = impulse.getChannelData(channel);
        for (let i = 0; i < length; i++) {
            channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, settings.decay);
        }
    }
    
    deck.effects.reverb.buffer = impulse;
    connectEffect(deckIndex, 'reverb');
}

// Create delay effect
function createDelay(deckIndex) {
    const deck = app.decks[deckIndex];
    const settings = deck.effects.settings.delay;
    
    deck.effects.delay = audioContext.createDelay();
    deck.effects.delay.delayTime.value = settings.time;
    
    const feedback = audioContext.createGain();
    feedback.gain.value = settings.feedback;
    
    deck.effects.delay.connect(feedback);
    feedback.connect(deck.effects.delay);
    
    connectEffect(deckIndex, 'delay');
}

// Create filter effect
function createFilter(deckIndex) {
    const deck = app.decks[deckIndex];
    const settings = deck.effects.settings.filter;
    
    deck.effects.filter = audioContext.createBiquadFilter();
    deck.effects.filter.type = 'bandpass';
    deck.effects.filter.frequency.value = settings.frequency;
    deck.effects.filter.Q.value = settings.Q;
    
    connectEffect(deckIndex, 'filter');
}

// Create flanger effect
function createFlanger(deckIndex) {
    const deck = app.decks[deckIndex];
    const settings = deck.effects.settings.flanger;
    
    deck.effects.flanger = audioContext.createDelay();
    deck.effects.flanger.delayTime.value = settings.delay;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.frequency.value = settings.rate;
    gainNode.gain.value = settings.depth;
    
    oscillator.connect(gainNode);
    gainNode.connect(deck.effects.flanger.delayTime);
    oscillator.start();
    
    connectEffect(deckIndex, 'flanger');
}

// Connect effect to audio chain
function connectEffect(deckIndex, effectType) {
    const deck = app.decks[deckIndex];
    const effect = deck.effects[effectType];
    if (!effect) return;

    // Disconnect current chain
    deck.effects.highEQ.disconnect();
    
    // Connect through effect
    deck.effects.highEQ.connect(effect);
    effect.connect(audioContext.destination);
}

// Disconnect effect from audio chain
function disconnectEffect(deckIndex, effectType) {
    const deck = app.decks[deckIndex];
    const effect = deck.effects[effectType];
    if (!effect) return;

    // Reconnect direct chain
    deck.effects.highEQ.disconnect();
    deck.effects.highEQ.connect(audioContext.destination);
    
    // Clean up effect
    effect.disconnect();
}

// Update effect button UI
function updateEffectButton(deckIndex, effectType, isActive) {
    const button = document.querySelector(`#deck${deckIndex + 1} .fx-button[data-effect="${effectType}"]`);
    if (button) {
        if (isActive) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    }
}

// Export functions
window.initializeEffects = initializeEffects;
window.updateEQ = updateEQ;
window.toggleEffect = toggleEffect;

