import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import './PlaylistSongsPage.css'
import Header from './Header'
import Notification from './Notification'
import DifficultySelector from './DifficultySelector'

function PlaylistSongsPage({ API_URL, setIsAuthenticated }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [savedSongIds, setSavedSongIds] = useState([])
  const [notification, setNotification] = useState(null)
  const [showDifficultySelector, setShowDifficultySelector] = useState(false)
  const [selectedSong, setSelectedSong] = useState(null)
  const [detectedDifficulty, setDetectedDifficulty] = useState('intermediate')

  useEffect(() => {
    fetchPlaylistSongs()
    fetchSavedIds()
  }, [id])

  const fetchPlaylistSongs = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await axios.get(`${API_URL}/api/playlist/${id}`, {
        withCredentials: true
      })
      setSongs(response.data || [])
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/')
      } else {
        setError('Failed to load songs. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchSavedIds = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/collection`, { withCredentials: true })
      setSavedSongIds(data.map(s => s.song_id))
    } catch {
      // non-blocking
    }
  }

  const handleSaveClick = async (e, song) => {
    e.stopPropagation()

    if (savedSongIds.includes(song.id)) {
      await axios.delete(`${API_URL}/api/collection/${song.id}`, { withCredentials: true })
      setSavedSongIds(savedSongIds.filter(sid => sid !== song.id))
      setNotification('Removed from collection')
      setTimeout(() => setNotification(null), 3000)
      return
    }

    setDetectedDifficulty(song.difficulty || 'intermediate')
    setSelectedSong(song)
    setShowDifficultySelector(true)
  }

  const handleDifficultySelected = async (difficulty) => {
    if (selectedSong) {
      await axios.post(`${API_URL}/api/collection`, {
        song_id: selectedSong.id,
        name: selectedSong.name,
        artist: selectedSong.artists?.[0]?.name || 'Unknown Artist',
        album: selectedSong.album?.name || '',
        image: selectedSong.album?.images?.[0]?.url || '',
        spotify_url: selectedSong.external_urls?.spotify || '',
        songsterr_url: selectedSong.songsterrUrl || '',
        difficulty
      }, { withCredentials: true })

      setSavedSongIds([...savedSongIds, selectedSong.id])
      setNotification('Added to collection')
      setTimeout(() => setNotification(null), 3000)
    }
    setShowDifficultySelector(false)
    setSelectedSong(null)
  }

  return (
    <div className="songs-page">
      <Header API_URL={API_URL} setIsAuthenticated={setIsAuthenticated} />
      <div className="songs-container">
        <button onClick={() => navigate('/playlists')} className="back-btn">
          ← Back to Playlists
        </button>

        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Analyzing songs for guitar tabs...</p>
            <p className="loading-subtitle">This may take a moment</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <p className="error-message">{error}</p>
            <button onClick={fetchPlaylistSongs} className="retry-btn">Try Again</button>
          </div>
        ) : (
          <>
            <div className="page-header">
              <h1>Guitar Songs Found</h1>
              <p className="page-subtitle">Click to view guitar tabs on Songsterr</p>
            </div>

            {songs.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🎸</div>
                <p>No guitar songs found</p>
                <p className="empty-subtitle">
                  None of the songs in this playlist have guitar tabs available on Songsterr.
                </p>
              </div>
            ) : (
              <div className="songs-list">
                {songs.map((song, index) => (
                  <div
                    key={song.id || index}
                    className="song-card"
                    onClick={() => song.songsterrUrl && window.open(song.songsterrUrl, '_blank')}
                  >
                    <div className="song-number">{index + 1}</div>
                    <div className="song-image-container">
                      {song.album?.images?.length > 0 ? (
                        <img
                          src={song.album.images[song.album.images.length - 1].url}
                          alt={song.album.name}
                          className="song-image"
                        />
                      ) : (
                        <div className="song-image-placeholder">
                          <span className="placeholder-icon">🎵</span>
                        </div>
                      )}
                    </div>
                    <div className="song-info">
                      <h3 className="song-name">{song.name}</h3>
                      <p className="song-artist">
                        {song.artists?.map(a => a.name).join(', ') || 'Unknown Artist'}
                      </p>
                      {song.album && <p className="song-album">{song.album.name}</p>}
                    </div>
                    <div className="song-actions">
                      <button
                        className={`save-btn${savedSongIds.includes(song.id) ? ' saved' : ''}`}
                        onClick={(e) => handleSaveClick(e, song)}
                        title={savedSongIds.includes(song.id) ? 'Remove from collection' : 'Add to collection'}
                      >
                        {savedSongIds.includes(song.id) ? '✓' : '+'}
                      </button>
                      {song.external_urls?.spotify && (
                        <button
                          className="spotify-link-btn"
                          onClick={(e) => { e.stopPropagation(); window.open(song.external_urls.spotify, '_blank') }}
                          title="Open in Spotify"
                        >
                          <svg viewBox="0 0 24 24" className="spotify-icon-small">
                            <path fill="currentColor" d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {notification && (
          <Notification message={notification} onClose={() => setNotification(null)} />
        )}

        {showDifficultySelector && (
          <DifficultySelector
            detectedDifficulty={detectedDifficulty}
            onSelect={handleDifficultySelected}
            onCancel={() => { setShowDifficultySelector(false); setSelectedSong(null) }}
          />
        )}
      </div>
    </div>
  )
}

export default PlaylistSongsPage
