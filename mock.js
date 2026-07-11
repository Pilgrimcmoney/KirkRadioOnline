// Mock data for Kirk Radio DJ. Audio files are served from /audio (same-origin).

export const GENRES = [
  'Dance & EDM', 'Deep House', 'Drum & Bass', 'Dubstep', 'Electronic',
  'Hip-hop & Rap', 'House', 'Latin', 'Pop', 'R&B', 'Techno', 'Trap'
];

const AUDIO = ['/audio/track1.mp3', '/audio/track2.mp3', '/audio/track3.mp3', '/audio/track4.mp3'];

// deterministic pick
const pick = (i) => AUDIO[i % AUDIO.length];

export const TRACKS = [
  { id: 53, title: "Bring 'Em Out", artist: 'YoungBoy Never Broke Again', time: '2:41', bpm: 76, structure: '', genre: 'Hip-hop & Rap', src: pick(0) },
  { id: 54, title: 'Bullet Train ft. Joni Fatora', artist: 'Dubstep', time: '4:05', bpm: 130, structure: '', genre: 'Dubstep', src: pick(1) },
  { id: 55, title: 'My Way (STVCKS Remix)', artist: 'Shadow Anthem', time: '3:02', bpm: 128, structure: '', genre: 'Futuristic', src: pick(2) },
  { id: 56, title: 'Camelot', artist: 'NLE Choppa', time: '2:28', bpm: 87, structure: '', genre: 'Hip-hop & Rap', src: pick(3) },
  { id: 57, title: 'Can I Call You Tonight?', artist: 'Dayglow', time: '4:37', bpm: 130, structure: '', genre: 'Indie', src: pick(0) },
  { id: 58, title: 'Candy', artist: 'DOJA CAT', time: '3:10', bpm: 125, structure: '', genre: 'R&B', src: pick(1) },
  { id: 59, title: 'On & On (ft. Daniel Levi)', artist: 'NCS', time: '3:27', bpm: 174, structure: '', genre: 'Electronic', src: pick(2) },
  { id: 60, title: 'Why We Lose (feat. Coleman Trapp)', artist: 'NCS', time: '3:39', bpm: 88, structure: '', genre: 'Drum & Bass', src: pick(3) },
  { id: 61, title: 'Lugu', artist: 'Musicology record', time: '3:17', bpm: 123, structure: '', genre: 'Pop', src: pick(0) },
  { id: 62, title: 'TIME FT DELIAH (ALCEMIST REMIX)', artist: 'ALCEMIST', time: '5:11', bpm: 87, structure: '', genre: 'Drum & Bass', src: pick(1) },
  { id: 63, title: 'Midnight City', artist: 'Aurora Beats', time: '4:03', bpm: 105, structure: '', genre: 'House', src: pick(2) },
  { id: 64, title: 'Neon Skyline', artist: 'Voltage', time: '3:48', bpm: 126, structure: '', genre: 'Dance & EDM', src: pick(3) },
  { id: 65, title: 'Deep Ocean', artist: 'Marlo', time: '6:12', bpm: 122, structure: '', genre: 'Deep House', src: pick(0) },
  { id: 66, title: 'Rewind', artist: 'Kaskade Jr', time: '3:55', bpm: 128, structure: '', genre: 'House', src: pick(1) },
  { id: 67, title: 'Afterglow', artist: 'Lumen', time: '4:20', bpm: 118, structure: '', genre: 'Electronic', src: pick(2) },
  { id: 68, title: 'Bassline Theory', artist: 'SubDivide', time: '3:33', bpm: 140, structure: '', genre: 'Dubstep', src: pick(3) },
  { id: 69, title: 'Golden Hour', artist: 'Solstice', time: '3:12', bpm: 100, structure: '', genre: 'Pop', src: pick(0) },
  { id: 70, title: 'Warehouse', artist: 'Grid', time: '5:40', bpm: 132, structure: '', genre: 'Techno', src: pick(1) },
  { id: 71, title: 'Lost in Tokyo', artist: 'Reed & Caruso', time: '4:08', bpm: 124, structure: '', genre: 'Dance & EDM', src: pick(2) },
  { id: 72, title: 'Velvet', artist: 'Nova Ray', time: '3:29', bpm: 110, structure: '', genre: 'R&B', src: pick(3) },
];

export const DRIVE_FILES = [
  { id: 'd1', name: 'Summer_Set_Live.mp3', size: '8.2 MB', bpm: 124, time: '4:12', src: '/audio/track1.mp3' },
  { id: 'd2', name: 'Rooftop_Party_Mix.mp3', size: '7.4 MB', bpm: 126, time: '3:58', src: '/audio/track2.mp3' },
  { id: 'd3', name: 'Late_Night_Deep.mp3', size: '9.1 MB', bpm: 120, time: '5:03', src: '/audio/track3.mp3' },
  { id: 'd4', name: 'Festival_Anthem.mp3', size: '6.8 MB', bpm: 130, time: '3:40', src: '/audio/track4.mp3' },
  { id: 'd5', name: 'Sunset_Chill.mp3', size: '5.9 MB', bpm: 98, time: '4:30', src: '/audio/track1.mp3' },
  { id: 'd6', name: 'Kirk_Radio_Jingle.mp3', size: '1.2 MB', bpm: 100, time: '0:45', src: '/audio/track2.mp3' },
];
