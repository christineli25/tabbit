const axios = require('axios');
const cors = require('cors');
const dotenv = require('dotenv').config();
const session = require('express-session');

const express = require('express');

const app = express();

// middleware

const allowedOrigins = [
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://localhost:5173',
  'http://localhost:5174'
];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL.replace(/\/$/, ''));
}
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(null, allowedOrigins[0]);
    }
  },
  credentials: true
}));

app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    name: 'connect.sid',
    cookie: { 
      secure: false,
      httpOnly: true,
      maxAge: null, // Session cookie
      sameSite: 'lax'
    }
  }));

const PORT = process.env.PORT || 8000;

app.listen(PORT, '127.0.0.1', () => {
    console.log(`Server is running on http://127.0.0.1:${PORT}`);
});
  

app.get('/auth/login', async (req, res) => {
    // 1. Get input (from req)
    const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
    const REDIRECT_URI = process.env.REDIRECT_URI;
    const scopes = 'user-read-private playlist-read-private';
    
    const authUrl = `https://accounts.spotify.com/authorize?` +
    `client_id=${CLIENT_ID}&` +
    `response_type=code&` +
    `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
    `scope=${encodeURIComponent(scopes)}`;
    
    res.redirect(authUrl);
  });

app.get('/callback', async (req, res) => {
    const code = req.query.code;
    const frontendBase = process.env.FRONTEND_URL || 'http://127.0.0.1:5173';
    if (!code) {
        return res.redirect(`${frontendBase}/?error=no_code`);
    }

    const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
    const CLIENT_ID_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
    const REDIRECT_URI = process.env.REDIRECT_URI;

    try {
        const response = await axios.post('https://accounts.spotify.com/api/token',
            new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: REDIRECT_URI,
                client_id: CLIENT_ID,
                client_secret: CLIENT_ID_SECRET
            }),
            {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        
        const accessToken = response.data.access_token;
        const refreshToken = response.data.refresh_token;

        req.session.accessToken = accessToken;
        req.session.refreshToken = refreshToken;

        res.redirect(`${frontendBase}/playlists`);
    } catch (error) {
        console.error('Error getting token:', error);
        return res.redirect(`${frontendBase}/?error=authentication_failed`);
    }
});

const defaultFrontend = process.env.FRONTEND_URL || 'http://127.0.0.1:5173';
const allowedReturnToPrefixes = ['http://127.0.0.1:5173', 'http://127.0.0.1:5174', 'http://localhost:5173', 'http://localhost:5174'];
if (process.env.FRONTEND_URL) {
  allowedReturnToPrefixes.push(process.env.FRONTEND_URL.replace(/\/$/, ''));
}
app.get('/auth/logout', (req, res) => {
    let returnTo = req.query.returnTo || `${defaultFrontend}/`;
    if (!allowedReturnToPrefixes.some(prefix => returnTo.startsWith(prefix))) returnTo = `${defaultFrontend}/`;
    const cookieName = 'connect.sid';
    
    req.session.destroy((err) => {
        res.clearCookie(cookieName, { path: '/', httpOnly: true, secure: false, sameSite: 'lax' });
        res.clearCookie(cookieName, { path: '/' });
        res.clearCookie(cookieName);
        if (err) console.error('Error destroying session:', err);
        res.redirect(returnTo);
    });
});

app.get('/api/me', async (req, res) => {
    // Check if session exists and has accessToken
    if (!req.session || !req.session.accessToken) {
      return res.status(401).json({ authenticated: false, error: 'Not authenticated' });
    }

    const accessToken = req.session.accessToken;

    try {
      const response = await axios.get('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      return res.json({
        authenticated: true,
        user: response.data
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      // If token is invalid, clear session
      if (req.session) {
        req.session.destroy(() => {});
      }
      return res.status(401).json({ authenticated: false, error: 'Failed to fetch user' });
    }
    
  });

app.post('/api/logout', async (req, res) => {
  try {
    console.log('Logout request received, session ID:', req.sessionID);
    
    // Prevent caching of logout response
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    // Clear session data first
    if (req.session) {
      req.session.accessToken = null;
      req.session.refreshToken = null;
    }
    
    // Get cookie name from session config
    const cookieName = 'connect.sid';
    
    // Destroy the session
    return new Promise((resolve) => {
      req.session.destroy((err) => {
        // Always clear cookie, even if destroy had an error
        // Clear with all possible options to ensure it's removed
        res.clearCookie(cookieName, {
          path: '/',
          httpOnly: true,
          secure: false,
          sameSite: 'lax'
        });
        
        // Also try clearing with different path options
        res.clearCookie(cookieName, { path: '/' });
        res.clearCookie(cookieName);
        
        if (err) {
          console.error('Error destroying session:', err);
          res.status(200).json({ success: false, authenticated: false, error: 'Session destroy failed but cookie cleared' });
          return resolve();
        }
        
        console.log('Session destroyed successfully, cookie cleared');
        res.status(200).json({ success: true, authenticated: false, message: 'Logged out successfully' });
        resolve();
      });
    });
  } catch (error) {
    console.error('Error in logout handler:', error);
    // Still try to clear cookie
    res.clearCookie('connect.sid', { path: '/' });
    res.clearCookie('connect.sid');
    return res.status(200).json({ success: false, authenticated: false, error: 'Logout error occurred' });
  }
})

app.get('/api/playlists', async (req, res) => {
  const accessToken = req.session.accessToken;
  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const response = await axios.get('https://api.spotify.com/v1/me/playlists', {
        headers: {Authorization: `Bearer ${accessToken}` }
    });
    return res.status(200).json({ playlists: response.data });
  } catch (error) {
    console.error('Error fetching playlists:', error);
    return res.status(500).json({ error: 'Failed to fetch playlists' });
  }
  
});

app.get('/api/playlist/:id', async (req, res) => {
    const accessToken = req.session.accessToken;
    
    if (!accessToken) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const playlistId = req.params.id;
    if (!playlistId) {
        return res.status(400).json({ error: 'Playlist ID is required' });
    }

    try {
        const response = await axios.get(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
            headers: {Authorization: `Bearer ${accessToken}`}
        });
        const tracks = response.data.items.map(item => item.track);
        const guitarSongs = [];
        for (const track of tracks) {
            if (track && track.name && track.artists?.[0]?.name) {
                const songsterrUrl = await checkForGuitarTabsCached(track.name, track.artists[0].name);
                if (songsterrUrl) { // If we got a URL, the song has tabs
                    guitarSongs.push({
                        ...track, 
                        isGuitar: true,
                        songsterrUrl: songsterrUrl // Add the URL to the song object
                    });
                }
            }

        }
        return res.json(guitarSongs);
    } catch (error) {
        console.error('Error fetching playlist:', error);
        return res.status(500).json({ error: 'Failed to fetch playlist' });
    }
});

app.get('/api/audio-features/:id', async (req, res) => {
    const accessToken = req.session.accessToken;
    
    if (!accessToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
  
    const trackId = req.params.id;
  
    try {
      const response = await axios.get(
        `https://api.spotify.com/v1/audio-features/${trackId}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
      
      return res.json({
        features: response.data
      });
    } catch (error) {
      console.error('Error fetching audio features:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch audio features'
      });
    }
  });

async function checkForGuitarTabs(trackName, artistName) {
    try {
      const searchQuery = `${trackName} ${artistName}`;
      
      // Songsterr API endpoint changed - now we need to parse HTML response
      const response = await axios.get(
        'https://www.songsterr.com/a/wa/search',
        {
          params: {
            pattern: searchQuery
          },
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }
      );
      
      const html = response.data;
      
      // Songs are in HTML with data-song attribute
      // Each song has: <div data-field="name">song title</div> and <div data-field="artist">artist name</div>
      // Extract all song entries from the HTML
      const songEntries = [];
      const songLinkRegex = /<a[^>]*data-song[^>]*>([\s\S]*?)<\/a>/g;
      let match;
      
      while ((match = songLinkRegex.exec(html)) !== null) {
        const fullLinkTag = match[0]; // The entire <a> tag including href
        const songHtml = match[1]; // The content inside the <a> tag
        
        // Extract the href URL from the <a> tag
        const hrefMatch = fullLinkTag.match(/href="([^"]+)"/);
        const songsterrUrl = hrefMatch ? hrefMatch[1] : null;
        
        // Extract song name
        const nameMatch = songHtml.match(/<div[^>]*data-field="name"[^>]*>([^<]+)<\/div>/);
        // Extract artist name
        const artistMatch = songHtml.match(/<div[^>]*data-field="artist"[^>]*>([^<]+)<\/div>/);

        if (nameMatch && artistMatch) {
          songEntries.push({
            title: nameMatch[1].trim(),
            artist: artistMatch[1].trim(),
            url: songsterrUrl
          });
        }
      }
      
      if (songEntries.length === 0) {
        return null;
      }
      
      // Normalize strings for comparison
      const normalize = (str) => str.toLowerCase().trim().replace(/[^\w\s]/g, '');
      const normalizedTrack = normalize(trackName);
      const normalizedArtist = normalize(artistName);
      
      // Check if any song matches (fuzzy match)
      for (const song of songEntries) {
        const songTitle = normalize(song.title);
        const songArtist = normalize(song.artist);
        
        // Check if track name and artist name are found in the song data
        if (songTitle.includes(normalizedTrack) || normalizedTrack.includes(songTitle)) {
          if (songArtist.includes(normalizedArtist) || normalizedArtist.includes(songArtist)) {
            // Return the full Songsterr URL
            const fullUrl = song.url.startsWith('http') 
              ? song.url 
              : `https://www.songsterr.com${song.url}`;
            return fullUrl;
          }
        }
      }
      
      return null; // Return null when no match found
    } catch (error) {
      console.error('Error checking tabs:', error.message);
      return null; // Return null on error
    }
  }

const tabsCache = new Map();

async function checkForGuitarTabsCached(trackName, artistName) {
  const cacheKey = `${trackName}::${artistName}`.toLowerCase();

  if (tabsCache.has(cacheKey)) {
    return tabsCache.get(cacheKey);
  }

  const hasTabs = await checkForGuitarTabs(trackName, artistName);

  tabsCache.set(cacheKey, hasTabs);
  
  return hasTabs;
}