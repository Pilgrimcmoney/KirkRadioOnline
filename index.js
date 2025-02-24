import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';

const AVAILABLE_ASSETS = [
  {
    "name": "ca_pluto",
    "shortid": "VkN2",
    "file_type": "m3u",
    "url": "https://play.rosebud.ai/assets/ca_pluto.m3u?VkN2"
  }
];
const M3UPlayer = () => {
  const defaultUrl = AVAILABLE_ASSETS[0].url;
  const [url, setUrl] = useState(defaultUrl);
  const [currentStream, setCurrentStream] = useState(null);
  const [playlist, setPlaylist] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  React.useEffect(() => {
    loadPlaylist();
  }, []); // Initial load
  // Add console logging for debugging
  React.useEffect(() => {
    if (currentStream) {
      console.log('Current stream changed:', currentStream);
    }
  }, [currentStream]);

  const parseM3U = (content) => {
    const lines = content.split('\n');
    const streams = [];
    let currentStream = {};

    lines.forEach(line => {
      line = line.trim();
      if (line.startsWith('#EXTINF:')) {
        // Extract title from EXTINF line
        const titleMatch = line.match(/,(.+)$/);
        currentStream.title = titleMatch ? titleMatch[1] : 'Untitled Stream';
      } else if (line && !line.startsWith('#')) {
        currentStream.url = line;
        streams.push({ ...currentStream });
        currentStream = {};
      }
    });

    return streams;
  };

  const loadPlaylist = async () => {
    if (!url) {
      setError('Please enter a valid M3U URL');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'text/plain',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const content = await response.text();
      const streams = parseM3U(content);
      
      if (streams.length === 0) {
        throw new Error('No valid streams found in playlist');
      }
      
      setPlaylist(streams);
      
      // Set the first stream as current if none is selected
      if (!currentStream) {
        setCurrentStream(streams[0]);
      }
      
      setError('');
    } catch (err) {
      setError('Failed to load playlist. Make sure the URL is correct and accessible.');
      setPlaylist([]);
    }

    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1>Pluto TV Canada</h1>
        <div style={styles.subHeader}>Streaming Player</div>
      </header>

      <div style={styles.inputSection}>
        <button 
          onClick={loadPlaylist}
          disabled={loading}
          style={styles.button}
        >
          {loading ? 'Loading...' : 'Refresh Channels'}
        </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.playerSection}>
        {currentStream && (
          <div style={styles.videoWrapper}>
            <video
              controls
              autoPlay
              style={styles.videoPlayer}
              key={currentStream.url}
              src={currentStream.url}
              onError={(e) => {
                console.error('Video Error:', e);
                setError(`Failed to play stream: ${currentStream.title}`);
              }}
            >
              Your browser doesn't support video playback.
            </video>
          </div>
        )}
      </div>

      <div style={styles.playlist}>
        <h2>Playlist</h2>
        {playlist.map((stream, index) => (
          <div
            key={index}
            style={{
              ...styles.playlistItem,
              backgroundColor: currentStream && currentStream.url === stream.url ? '#e0e0e0' : 'transparent'
            }}
            onClick={() => setCurrentStream(stream)}
          >
            <span style={styles.streamTitle}>{stream.title || 'Untitled Stream'}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px',
    color: '#333',
    background: 'linear-gradient(45deg, #1a1a1a, #4a4a4a)',
    padding: '20px',
    borderRadius: '8px',
    color: '#fff',
  },
  subHeader: {
    fontSize: '1.2em',
    color: '#ccc',
    marginTop: '10px',
  },
  inputSection: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
  },
  input: {
    flex: 1,
    padding: '10px',
    fontSize: '16px',
    borderRadius: '4px',
    border: '1px solid #ccc',
  },
  button: {
    padding: '10px 20px',
    fontSize: '16px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  error: {
    color: 'red',
    marginBottom: '20px',
  },
  playerSection: {
    marginBottom: '20px',
  },
  videoWrapper: {
    position: 'relative',
    width: '100%',
    paddingTop: '56.25%', // 16:9 aspect ratio
    backgroundColor: '#000',
    borderRadius: '8px',
    overflow: 'hidden',
    marginBottom: '20px',
  },
  videoPlayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  streamTitle: {
    display: 'block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  playlist: {
    backgroundColor: '#f8f9fa',
    padding: '20px',
    borderRadius: '4px',
  },
  playlistItem: {
    padding: '10px',
    cursor: 'pointer',
    borderBottom: '1px solid #ddd',
    '&:hover': {
      backgroundColor: '#eee',
    },
  },
};

const App = () => {
  return <M3UPlayer />;
};

const container = document.getElementById('renderDiv');
const root = ReactDOM.createRoot(container);
root.render(<App />);
