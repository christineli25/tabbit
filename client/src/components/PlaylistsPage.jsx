import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'
import './PlaylistsPage.css'
import Header from './Header'

function PlaylistsPage({ API_URL, setIsAuthenticated }) {
  const [playlists, setPlaylists] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    fetchPlaylists()
  }, [])

  const fetchPlaylists = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_URL}/api/playlists`, {
        withCredentials: true
      })
      setPlaylists(response.data.playlists.items || [])
      setError(null)
    } catch (err) {
      console.error('Error fetching playlists:', err)
      if (err.response?.status === 401) {
        setIsAuthenticated(false)
        navigate('/')
      } else {
        setError('Failed to load playlists. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handlePlaylistClick = (playlistId) => {
    navigate(`/playlist/${playlistId}`)
  }

  if (loading) {
    return (
      <div className="playlists-page">
        <div className="playlists-container">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading your playlists...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="playlists-page">
        <div className="playlists-container">
          <div className="error-state">
            <p className="error-message">{error}</p>
            <button onClick={fetchPlaylists} className="retry-btn">
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="playlists-page">
      <Header API_URL={API_URL} setIsAuthenticated={setIsAuthenticated}/>
      <div className="playlists-container">
        <div className="page-header">
          <h1>Your Playlists</h1>
          <p className="page-subtitle">Select a playlist to find guitar songs</p>
        </div>
        <nav className="navigation-bar">
          <button 
            className={`nav-tab ${location.pathname === '/playlists' ? 'active' : ''}`}
            onClick={() => navigate('/playlists')}
          >
            Playlists
          </button>
          <button 
            className={`nav-tab ${location.pathname === '/collection' ? 'active' : ''}`}
            onClick={() => navigate('/collection')}
          >
            Collection
          </button>
        </nav>

        {playlists.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎵</div>
            <p>No playlists found</p>
            <p className="empty-subtitle">Create some playlists on Spotify to get started!</p>
          </div>
        ) : (
          <div className="playlists-grid">
            {playlists.map((playlist) => (
              <div
                key={playlist.id}
                className="playlist-card"
                onClick={() => handlePlaylistClick(playlist.id)}
              >
                <div className="playlist-image-container">
                  {playlist.images && playlist.images.length > 0 ? (
                    <img
                      src={playlist.images[0].url}
                      alt={playlist.name}
                      className="playlist-image"
                    />
                  ) : (
                    <div className="playlist-image-placeholder">
                      <span className="placeholder-icon">🎵</span>
                    </div>
                  )}
                </div>
                <div className="playlist-info">
                  <h3 className="playlist-name">{playlist.name}</h3>
                  <p className="playlist-tracks">
                    {playlist.tracks?.total || 0} tracks
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default PlaylistsPage

