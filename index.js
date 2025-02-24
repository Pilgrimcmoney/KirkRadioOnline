import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';

const M3UPlayer = () => {
  const [url, setUrl] = useState('');
  const [currentStream, setCurrentStream] = useState('');
  const [playlist, setPlaylist] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      const response = await fetch(url);
      const content = await response.text();
      const streams = parseM3U(content);
      setPlaylist(streams);
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
        <h1>M3U Stream Player</h1>
      </header>

      <div style={styles.inputSection}>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter M3U playlist URL"
          style={styles.input}
        />
        <button 
          onClick={loadPlaylist}
          disabled={loading}
          style={styles.button}
        >
          {loading ? 'Loading...' : 'Load Playlist'}
        </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.playerSection}>
        {currentStream && (
          <video
            controls
            autoPlay
            style={styles.videoPlayer}
            key={currentStream}
            src={currentStream}
          >
            Your browser doesn't support video playback.
          </video>
        )}
      </div>

      <div style={styles.playlist}>
        <h2>Playlist</h2>
        {playlist.map((stream, index) => (
          <div
            key={index}
            style={styles.playlistItem}
            onClick={() => setCurrentStream(stream.url)}
          >
            {stream.title || 'Untitled Stream'}
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
  videoPlayer: {
    width: '100%',
    backgroundColor: '#000',
    borderRadius: '4px',
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
