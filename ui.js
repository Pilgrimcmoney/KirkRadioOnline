// Kirk Radio DJ - UI Module
// Handles UI interactions and updates

// Service connection statuses
const connectionStatuses = {
    googleDrive: false,
    oneDrive: false,
    youtube: false,
    spotify: false,
    soundCloud: false,
    appleMusic: false
};

// Update connection status indicator
function updateConnectionStatus(service, isConnected) {
    const button = document.getElementById(`${service}Btn`);
    if (button) {
        const statusDot = button.querySelector('.connection-status');
        if (statusDot) {
            if (isConnected) {
                statusDot.classList.add('connected');
                button.classList.add('active');
            } else {
                statusDot.classList.remove('connected');
                button.classList.remove('active');
            }
        }
    }
    connectionStatuses[service] = isConnected;
}

// Toast notification system
function showToast(message, type = 'info') {
    // Create toast container if it doesn't exist
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 1000;
        `;
        document.body.appendChild(container);
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
        background: var(--background);
        color: var(--text-primary);
        padding: 12px 24px;
        border-radius: 4px;
        margin-top: 10px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        display: flex;
        align-items: center;
        border-left: 4px solid ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#2196f3'};
        min-width: 300px;
        max-width: 400px;
        animation: slideIn 0.3s ease-out;
    `;

    // Add icon based on type
    const icon = document.createElement('i');
    icon.className = `fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'} mr-2`;
    toast.appendChild(icon);

    // Add message
    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;
    toast.appendChild(messageSpan);

    // Add to container
    container.appendChild(toast);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Update deck display
function updateDeckDisplay(deckIndex, trackInfo) {
    const titleElement = document.getElementById(`deck${deckIndex + 1}Title`);
    const artistElement = document.getElementById(`deck${deckIndex + 1}Artist`);
    
    if (titleElement && trackInfo.title) {
        titleElement.textContent = trackInfo.title;
    }
    if (artistElement && trackInfo.artist) {
        artistElement.textContent = trackInfo.artist;
    }
}

// Initialize UI components
document.addEventListener('DOMContentLoaded', () => {
    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        
        .toast {
            transition: all 0.3s ease;
        }
    `;
    document.head.appendChild(style);

    // Initialize dropdowns
    const dropdowns = document.querySelectorAll('.dropdown');
    dropdowns.forEach(dropdown => {
        const button = dropdown.querySelector('button');
        const content = dropdown.querySelector('.dropdown-content');
        
        if (button && content) {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                content.style.display = content.style.display === 'block' ? 'none' : 'block';
            });
        }
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.dropdown')) {
            document.querySelectorAll('.dropdown-content').forEach(content => {
                content.style.display = 'none';
            });
        }
    });
});

// Export functions
window.showToast = showToast;
window.updateConnectionStatus = updateConnectionStatus;
window.updateDeckDisplay = updateDeckDisplay;

