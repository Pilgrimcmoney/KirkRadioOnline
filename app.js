const socket = new WebSocket('ws://localhost:8765');

socket.onopen = () => {
    console.log('WebSocket connection established');
};

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('Received:', data);
};

function sendCommand(command, params) {
    socket.send(JSON.stringify({
        command: command,
        params: params
    }));
}

function loadTrack(deck) {
    sendCommand('load_track', { deck: deck });
}

function play(deck) {
    sendCommand('play', { deck: deck });
}

function pause(deck) {
    sendCommand('pause', { deck: deck });
}

// Add more control functions as needed
