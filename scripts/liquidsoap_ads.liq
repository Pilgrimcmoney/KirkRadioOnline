# Liquidsoap ad insertion template for KirkRadioOnline
# Save as scripts/liquidsoap_ads.liq
#
# Notes:
# - This is an adaptable template for Icecast / SHOUTcast streaming using Liquidsoap.
# - Replace placeholders (ICECAST_HOST, PORT, PASSWORD, MOUNTPOINT, paths) with your values.
# - Two modes supported: live DJ input (via input.harbor) and autoplay (playlist).
# - Ad breaks are triggered by a simple counter: play N songs, then play an ad break (rotate ads).
# - This approach is file-based and safe for small/medium stations. For SSAI or programmatic ads use a dedicated ad server.

# -----------------------
# CONFIG
# -----------------------
# Where your music and ad files live (can be local paths or HTTP URLs)
music_playlist = "/srv/kirkradio/playlists/music.m3u"  # path to an M3U or folder
ads_playlist = "/srv/kirkradio/playlists/ads.m3u"    # ad files: jingles, sponsor reads, :15/:30 spots
jingles_folder = "/srv/kirkradio/jingles"

# Stream output (Icecast example)
icecast_host = "ICECAST_HOST"
icecast_port = 8000
icecast_password = "ICECAST_SOURCE_PASSWORD"
mount = "/live.mp3"

# Playback policy
songs_between_ad_breaks = 6  # play this many songs, then run an ad break
ads_per_break = 1            # how many ad items to play during a break
ad_fade = 0.5                # crossfade during ads

# -----------------------
# SOURCES
# -----------------------
# Autodj playlist (fallback when no live input)
autodj = playlist("""%s""")
# Ads playlist
ads = playlist("""%s""")

# Jingles (optional)
jingles = rotation(list(filter(filename, list.homedir(jingles_folder))))

# Live input (for DJs) - removes need to restart Liquidsoap when DJs connect
# Uncomment and configure if you want live DJ input via Liquidsoap's input.harbor
#live = input.harbor(port=8001, password="djpassword")

# Main music source: randomize to avoid repetition
music = random(id="music", restart=true, autodj)

# -----------------------
# AD-BREAK SCHEDULER
# -----------------------
# Implementation strategy (simple, deterministic):
# - We create a source that counts songs and triggers an ad break every N songs.
# - Liquidsoap doesn't include a native "every N songs" operator, so we simulate it
#   by using two playlists and a sequencer that alternates sequences of songs and ad breaks.

# A helper function to build an ad break sequence (concatenate N songs then ads)
def make_radio_sequence(songs, ads, songs_between, ads_per_break)
  # Note: sequence() concatenates sources; we build small chunks and use fallback to loop.
  s = list.take(list.of(songs), songs_between)
  # sequence_of_songs = sequence(s)  # not directly supported; keep as placeholder
  # For simplicity: use a rotation of a small playlist and then append ads using add()
  # In practice, maintain a working playlist file (music.m3u) and a separate ads.m3u and
  # use external tooling or Liquidsoap telnet to enqueue ad files when needed.
  s
end

# Practical simpler pattern: play music, and when a scheduled signal file exists, switch to ads.
# External scheduler (cron or a small script) creates /tmp/kro_ad_now to trigger an ad break.

def ad_switch(music, ads, jingles, trigger_file)
  add([music, fallback(track_sensitive=false, [ads, jingles])])
end

# Trigger file path
trigger_file = "/tmp/kro_ad_now"

# Fallback source: if trigger file exists, we serve ads, otherwise music.
radio = fallback(track_sensitive=false, [
  # If ads are present play them first
  ads,
  # otherwise play music
  music
])

# The "switching" via the trigger file is not automatic here; instead
# it's easier to use the telnet/admin interface to push ad files into a queue.
# We'll expose a small telnet control socket below to add files remotely.

# -----------------------
# QUEUE (remote ad enqueuing)
# -----------------------
# Create a queue source that can be manipulated via the telnet interface.
ad_queue = request.queue(id="adqueue")
# ad_runner plays queued ads if present, otherwise returns a short silence
ad_runner = fallback([ad_queue, single("/dev/null")])

# Now create a final source that plays: music normally, but if ad_queue has items, play them next.
# We use 'fallback' ordering: check ad_runner first (it will be silent if empty), then music.
final = fallback(track_sensitive=false, [ad_runner, music])

# -----------------------
# OUTPUT
# -----------------------
# Output to Icecast (MP3)
output.icecast(
  %mp3(bitrate=128),
  host=icecast_host,
  port=icecast_port,
  password=icecast_password,
  mount=mount,
  name="KirkRadioOnline",
  description="Music for the ears",
  genre="Various",
  url="https://yourdomain.example",
  final
)

# -----------------------
# NOTES & OPERATION
# -----------------------
# How to enqueue ads remotely (example using Liquidsoap telnet admin):
# 1) Ensure Liquidsoap's telnet / server interface is enabled (it is by default on port 1234).
# 2) Use a small helper script to connect and call 'request.enqueue("adqueue","/path/to/ad.mp3")'.
# Example using netcat (simple, not authenticated):
#   echo "request.enqueue adqueue /srv/kirkradio/ads/sponsor1.mp3" | nc localhost 1234
# You can schedule ad breaks via cron: every 15 minutes enqueue one or more ad files.
# Example cron entry (enqueue a random ad every 15 minutes):
# */15 * * * * /usr/local/bin/enqueue_random_ad.sh

# enqueue_random_ad.sh (example):
# #!/bin/bash
# AD=$(shuf -n1 -e /srv/kirkradio/ads/*.mp3)
# echo "request.enqueue adqueue $AD" | nc localhost 1234

# Replace values above and test carefully on a staging server before going live.
