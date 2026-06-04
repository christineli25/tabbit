const axios = require('axios');
const cors = require('cors');
require('dotenv').config();
const session = require('express-session');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

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
    `scope=${encodeURIComponent(scopes)}&` +
    `show_dialog=true`;
    
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

        const userResponse = await axios.get('https://api.spotify.com/v1/me', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        req.session.accessToken = accessToken;
        req.session.refreshToken = refreshToken;
        req.session.userId = userResponse.data.id;

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

app.get('/api/collection', async (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  const { data, error } = await supabase
    .from('collection')
    .select('*')
    .eq('user_id', userId)
    .order('date_added', { ascending: false });

  if (error) return res.status(500).json({ error: 'Failed to fetch collection' });
  return res.json(data);
});

app.post('/api/collection', async (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  const { song_id, name, artist, album, image, spotify_url, songsterr_url, difficulty } = req.body;

  const { data, error } = await supabase
    .from('collection')
    .insert({ user_id: userId, song_id, name, artist, album, image, spotify_url, songsterr_url, difficulty, status: 'want to learn' })
    .select()
    .single();

  if (error) return res.status(500).json({ error: 'Failed to save song' });
  return res.status(201).json(data);
});

app.delete('/api/collection/:songId', async (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  const { error } = await supabase
    .from('collection')
    .delete()
    .eq('user_id', userId)
    .eq('song_id', req.params.songId);

  if (error) return res.status(500).json({ error: 'Failed to remove song' });
  return res.json({ success: true });
});

app.patch('/api/collection/:songId', async (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  const { difficulty, status } = req.body;
  const updates = {};
  if (difficulty !== undefined) updates.difficulty = difficulty;
  if (status !== undefined) updates.status = status;

  const { error } = await supabase
    .from('collection')
    .update(updates)
    .eq('user_id', userId)
    .eq('song_id', req.params.songId);

  if (error) return res.status(500).json({ error: 'Failed to update song' });
  return res.json({ success: true });
});

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

    try {
        const response = await axios.get(`https://api.spotify.com/v1/playlists/${req.params.id}/tracks`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        const tracks = response.data.items.map(item => item.track).filter(
            track => track && track.name && track.artists?.[0]?.name
        );
        const results = await Promise.all(
            tracks.map(async track => {
                const tabInfo = await checkForGuitarTabsCached(track.name, track.artists[0].name);
                return tabInfo ? { ...track, isGuitar: true, songsterrUrl: tabInfo.url, difficulty: tabInfo.difficulty } : null;
            })
        );
        return res.json(results.filter(Boolean));
    } catch (error) {
        console.error('Error fetching playlist:', error);
        return res.status(500).json({ error: 'Failed to fetch playlist' });
    }
});


async function checkForGuitarTabs(trackName, artistName) {
  try {
    const response = await axios.get('https://www.songsterr.com/api/songs', {
      params: { pattern: `${trackName} ${artistName}` }
    });

    const songs = response.data;
    if (!songs?.length) return null;

    const normalize = (str) => str.toLowerCase().trim().replace(/[^\w\s]/g, '');
    const normalizedTrack = normalize(trackName);
    const normalizedArtist = normalize(artistName);

    const match = songs.find(song => {
      const title = normalize(song.title);
      const artist = normalize(song.artist);
      return (title.includes(normalizedTrack) || normalizedTrack.includes(title)) &&
             (artist.includes(normalizedArtist) || normalizedArtist.includes(artist));
    });

    if (!match) return null;

    const guitarTracks = match.tracks?.filter(t =>
      t.instrument?.toLowerCase().includes('guitar')
    ) || [];

    if (!guitarTracks.length) return null;

    const difficulties = guitarTracks.map(t => t.difficulty).filter(Boolean);
    const avg = difficulties.length
      ? difficulties.reduce((a, b) => a + b, 0) / difficulties.length
      : null;

    const difficulty = !avg ? 'intermediate'
      : avg <= 2 ? 'easy'
      : avg <= 3.5 ? 'intermediate'
      : 'hard';

    const slug = (str) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const url = `https://www.songsterr.com/a/wsa/${slug(match.artist)}-${slug(match.title)}-tab-s${match.songId}`;

    return { url, difficulty };
  } catch (error) {
    console.error('Error checking tabs:', error.message);
    return null;
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