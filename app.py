from flask import Flask, render_template, jsonify, Response, request, redirect
from flask_cors import CORS
import requests
import re
import asyncio
import aiohttp
import threading
import ssl
from datetime import datetime
from urllib.parse import unquote, urljoin

# Channel categories and their keywords
CATEGORIES = {
    'News': ['news', 'noticias', 'info', 'current', 'cnn', 'fox', 'bbc', 'msnbc', 'cnbc'],
    'Sports': ['sport', 'football', 'soccer', 'basketball', 'tennis', 'racing', 'espn', 'fight', 'ufc', 'wwe', 'olympic'],
    'Movies': ['movie', 'film', 'cinema', 'paramount', 'mgm', 'warner', 'disney', 'marvel', 'star'],
    'Entertainment': ['entertainment', 'mtv', 'vh1', 'comedy', 'lifestyle', 'reality', 'gameshow', 'talent'],
    'Kids': ['kids', 'children', 'cartoon', 'disney', 'nickelodeon', 'nick', 'toon', 'anime'],
    'Music': ['music', 'mtv', 'vh1', 'vevo', 'hit', 'rock', 'jazz', 'concert'],
    'Documentary': ['documentary', 'discovery', 'history', 'science', 'nature', 'animal', 'planet', 'geo', 'learn'],
    'Series': ['series', 'drama', 'sitcom', 'show', 'episode'],
    'Lifestyle': ['lifestyle', 'food', 'cooking', 'travel', 'home', 'garden', 'fashion', 'design'],
    'Religious': ['religious', 'religion', 'christian', 'islamic', 'jewish', 'hindu', 'spiritual'],
    'Business': ['business', 'finance', 'market', 'stock', 'economy', 'bloomberg', 'reuters'],
    'Weather': ['weather', 'climate', 'forecast']
}

# North American M3U source URL
M3U_URL = 'https://iptv-org.github.io/iptv/regions/nam.m3u'

app = Flask(__name__)
CORS(app)

# Global variables
channels = []
verification_in_progress = False

def detect_category(channel_name, group_title=''):
    """Detect channel category based on name and group title"""
    text = f"{channel_name} {group_title}".lower()
    
    # Try to match with categories
    for category, keywords in CATEGORIES.items():
        if any(keyword in text for keyword in keywords):
            return category
    
    return 'General'

def parse_m3u_line(line):
    """Parse an EXTINF line from M3U file"""
    try:
        # Extract duration and title
        duration_match = re.search(r'#EXTINF:([-]?\d+)', line)
        duration = int(duration_match.group(1)) if duration_match else 0
        
        # Extract title
        title_match = re.search(r'#EXTINF:[-]?\d+,(.+)', line)
        title = title_match.group(1).strip() if title_match else ''
        
        # Extract attributes
        attrs = {}
        attr_pattern = r'([\w-]+)="([^"]*)"'
        for match in re.finditer(attr_pattern, line):
            key, value = match.groups()
            attrs[key] = value
            
        return {
            'duration': duration,
            'title': title,
            'tvg-logo': attrs.get('tvg-logo', ''),
            'group-title': attrs.get('group-title', '')
        }
    except Exception as e:
        print(f"Error parsing M3U line: {e}")
        return None

def load_channels():
    """Load channels from the M3U source"""
    global channels
    try:
        print(f"Loading channels from {M3U_URL}")
        response = requests.get(M3U_URL, timeout=10)
        if response.status_code == 200:
            content = response.text
            print(f"Content length: {len(content)} bytes")
            channels = []
            current_info = None
            
            lines = content.splitlines()
            print(f"Total lines in file: {len(lines)}")
            extinf_count = sum(1 for line in lines if line.strip().startswith('#EXTINF:'))
            print(f"Number of #EXTINF entries: {extinf_count}")
            
            for line in content.splitlines():
                line = line.strip()
                
                if not line:
                    continue
                    
                if line.startswith('#EXTINF:'):
                    info = parse_m3u_line(line)
                    if info:
                        current_info = info
                elif line.startswith('#'):
                    continue
                elif current_info and not line.startswith('#'):
                    # This is a URL line
                    url = line if line.startswith('http') else urljoin(M3U_URL, line)
                    
                    # Detect category
                    category = detect_category(current_info['title'], current_info['group-title'])
                    
                    channel = {
                        'name': current_info['title'],
                        'url': url,
                        'verified': False,
                        'folder': category,
                        'logo': current_info['tvg-logo'],
                        'group': current_info['group-title'],
                        'type': 'live',
                        'last_checked': None,
                        'error': None
                    }
                    
                    channels.append(channel)
                    current_info = None
            
            print(f"Successfully loaded {len(channels)} North American channels")
            return True
            
    except Exception as e:
        print(f"Error loading channels: {e}")
        return False

async def verify_single_channel(session, channel):
    """Verify if a single channel is working"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': '*/*'
        }
        
        # Create a custom SSL context that ignores certificate errors
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        
        # Use short timeout for quick checks
        timeout = aiohttp.ClientTimeout(total=5, connect=2)
        
        try:
            async with session.get(channel['url'], headers=headers, ssl=ssl_context, timeout=timeout, allow_redirects=True) as response:
                if response.status != 200:
                    channel['verified'] = False
                    channel['error'] = f"HTTP {response.status}"
                    return
                
                # Check content type
                content_type = response.headers.get('content-type', '').lower()
                
                # For m3u8 streams
                if '.m3u8' in channel['url'].lower() or 'application/x-mpegurl' in content_type or 'application/vnd.apple.mpegurl' in content_type:
                    try:
                        # Read first chunk to verify it's a valid m3u8
                        data = await response.content.read(1024)
                        if b'#EXTM3U' in data:
                            channel['verified'] = True
                            print(f"Channel verified (HLS): {channel['name']}")
                            return
                    except:
                        pass
                
                # For direct streams
                elif any(t in content_type for t in ['video/', 'audio/', 'application/octet-stream']):
                    try:
                        # Read first chunk to verify it's a valid stream
                        data = await response.content.read(1024)
                        if data and len(data) > 0:
                            channel['verified'] = True
                            print(f"Channel verified (Direct): {channel['name']}")
                            return
                    except:
                        pass
                
                channel['verified'] = False
                channel['error'] = "Invalid stream format"
                
        except asyncio.TimeoutError:
            channel['verified'] = False
            channel['error'] = "Timeout"
        except Exception as e:
            channel['verified'] = False
            channel['error'] = str(e)
            
    except Exception as e:
        channel['verified'] = False
        channel['error'] = str(e)
    finally:
        channel['last_checked'] = datetime.now().isoformat()

async def verify_channels_background():
    """Verify all channels in background"""
    global verification_in_progress, channels
    
    if verification_in_progress:
        return
        
    verification_in_progress = True
    try:
        # Create a custom SSL context that ignores certificate errors
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        
        # Use shorter timeout and allow more concurrent connections
        timeout = aiohttp.ClientTimeout(total=5, connect=2)
        connector = aiohttp.TCPConnector(ssl=ssl_context, limit=25, force_close=True)
        
        async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
            tasks = []
            # Process all channels
            for channel in channels:
                tasks.append(verify_single_channel(session, channel))
            
            # Verify in medium-sized batches
            for i in range(0, len(tasks), 25):
                batch = tasks[i:i+25]
                await asyncio.gather(*batch)
                # Small delay between batches to prevent overwhelming
                await asyncio.sleep(0.2)
                
    except Exception as e:
        print(f"Error in verification: {e}")
    finally:
        verification_in_progress = False

def start_verification():
    """Start the channel verification process"""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(verify_channels_background())
    loop.close()

@app.route('/proxy/<path:url>')
def proxy_stream(url):
    """Proxy stream to avoid CORS issues"""
    try:
        # Decode URL if needed
        url = unquote(url)
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': '*/*',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Range': request.headers.get('Range', 'bytes=0-')
        }
        
        # Copy any important request headers
        for header in ['If-Modified-Since', 'If-None-Match']:
            if header in request.headers:
                headers[header] = request.headers[header]
        
        session = requests.Session()
        session.verify = False
        session.trust_env = False
        
        # Stream the response
        req = session.get(url, headers=headers, stream=True, timeout=10)
        
        # Handle redirects
        if 300 <= req.status_code < 400 and 'Location' in req.headers:
            return redirect(req.headers['Location'])
        
        # Copy response headers
        response_headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS, HEAD',
            'Access-Control-Allow-Headers': 'Content-Type, Range',
            'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Content-Type'
        }
        
        # Copy content headers
        for header in ['Content-Type', 'Content-Length', 'Content-Range', 'Accept-Ranges']:
            if header in req.headers:
                response_headers[header] = req.headers[header]
        
        if not response_headers.get('Content-Type'):
            response_headers['Content-Type'] = 'application/octet-stream'
        
        return Response(
            req.iter_content(chunk_size=8192),
            status=req.status_code,
            headers=response_headers
        )
        
    except requests.RequestException as e:
        print(f"Proxy error for {url}: {str(e)}")
        return f"Stream error: {str(e)}", 502
    except Exception as e:
        print(f"Unexpected proxy error for {url}: {str(e)}")
        return "Internal server error", 500

@app.route('/status')
def get_status():
    """Get current status of channel loading and verification"""
    total = len(channels)
    working = len([c for c in channels if c.get('verified', False)])
    
    return jsonify({
        'total': total,
        'working': working,
        'verifying': verification_in_progress
    })

@app.route('/channels')
def get_channels():
    """Get all channels"""
    # Only return channels that have been checked
    checked_channels = [c for c in channels if c.get('last_checked') is not None]
    return jsonify({
        'North American TV': checked_channels
    })

@app.route('/')
def index():
    """Render main page"""
    return render_template('index.html')

if __name__ == '__main__':
    # Load channels at startup
    if load_channels():
        # Start verification in background
        threading.Thread(target=start_verification, daemon=True).start()
    # Run on all network interfaces
    app.run(host='0.0.0.0', port=5000)
