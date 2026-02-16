import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { getCollection, removeFromCollection } from '../utils/collectionStorage'
import './CollectionPage.css'
import Header from './Header'

function CollectionPage({ API_URL, setIsAuthenticated }) {
    const [collection, setCollection] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const navigate = useNavigate()
    const location = useLocation()
    const [showDropdown, setShowDropdown] = useState(false)
    const [selectedFilter, setSelectedFilter] = useState('all')

    useEffect(() => {
        setCollection(getCollection())
        setLoading(false)
    }, [])

    const handleRemoveSong = (e, songId) => {
        e.stopPropagation() // Don't trigger the card click
        removeFromCollection(songId)
        setCollection(getCollection()) // Refresh collection
    }

    const handleCardClick = (song) => {
        if (song.songsterrUrl) {
            window.open(song.songsterrUrl, '_blank')
        }
    }

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showDropdown && !event.target.closest('.dropdown-container')) {
                setShowDropdown(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [showDropdown])

    if (loading) {
        return (
            <div className="collection-page">
                <div className="collection-container">
                    <div className="loading-state">
                        <div className="loading-spinner"></div>
                        <p>Loading your collection...</p>
                    </div>
                </div>
            </div>
        )
    }

    const filteredCollection = collection.filter((song) => {
        if(selectedFilter === 'all') {
            return true
        } else {
            return song.difficulty === selectedFilter
        }
    })

    return (
        <div className="collection-page">
            <Header API_URL={API_URL} setIsAuthenticated={setIsAuthenticated}/>
            <div className="collection-container">
                <div className="page-header">
                    <h1>My Collection</h1>
                    <p className="page-subtitle">All your saved guitar songs</p>
                </div>
                <nav className="navigation-bar">
                    <button 
                        className={`nav-tab ${location.pathname === '/playlists' ? 'active' : ''}`}
                        onClick={() => navigate('/playlists')}
                    >
                        Playlists
                    </button>
                    <div className="dropdown-container">
                        <button 
                            className={`nav-tab ${location.pathname === '/collection' ? 'active' : ''}`}
                            onClick={() => setShowDropdown(!showDropdown)}
                        >
                            Collection
                        </button>
                        {showDropdown && (
                            <div className="dropdown-content">
                                <button 
                                    className={selectedFilter === 'all' ? 'active' : ''}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedFilter('all');
                                        setShowDropdown(false);
                                    }}
                                >
                                    All
                                </button>
                                <button 
                                    className={selectedFilter === 'easy' ? 'active' : ''}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedFilter('easy');
                                        setShowDropdown(false);
                                    }}
                                >
                                    Easy
                                </button>
                                <button 
                                    className={selectedFilter === 'intermediate' ? 'active' : ''}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedFilter('intermediate');
                                        setShowDropdown(false);
                                    }}
                                >
                                    Intermediate
                                </button>
                                <button 
                                    className={selectedFilter === 'hard' ? 'active' : ''}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedFilter('hard');
                                        setShowDropdown(false);
                                    }}
                                >
                                    Hard
                                </button>
                            </div>
                        )}
                    </div>
                    
                </nav>

                {filteredCollection.length > 0 ? (
                    <div className="collection-list">
                        {filteredCollection.map((song) => (
                            <div 
                                className="collection-item" 
                                key={song.id}
                                onClick={() => handleCardClick(song)}
                                style={{ cursor: song.songsterrUrl ? 'pointer' : 'default' }}
                            >
                                <div className="song-image-container">
                                    {song.image ? (
                                        <img src={song.image} alt={song.name} className="song-image" />
                                    ) : (
                                        <div className="song-image-placeholder">
                                            <span className="placeholder-icon">🎸</span>
                                        </div>
                                    )}
                                </div>
                                <div className="song-info">
                                    <h3 className="song-name">{song.name}</h3>
                                    <p className="song-artist">{song.artist}</p>
                                    {song.album && (
                                        <p className="song-album">{song.album}</p>
                                    )}
                                </div>
                                <div className="song-actions">
                                    {song.spotifyUrl && (
                                        <a 
                                            href={song.spotifyUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className={`spotify-link ${song.difficulty}`}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                                            </svg>
                                        </a>
                                    )}
                                    <button
                                        className="remove-btn"
                                        onClick={(e) => handleRemoveSong(e, song.id)}
                                        title="Remove from collection"
                                    >
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <div className="empty-icon">🎸</div>
                        <p>No songs in collection</p>
                        <p className="empty-subtitle">Start adding songs from your playlists to see them here!</p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default CollectionPage;