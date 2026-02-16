import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import axios from 'axios'
import LoginPage from './components/LoginPage'
import PlaylistsPage from './components/PlaylistsPage'
import PlaylistSongsPage from './components/PlaylistSongsPage'
import './App.css'
import CollectionPage from './components/CollectionPage'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/me`, {
        withCredentials: true
      })
      setIsAuthenticated(response.data.authenticated === true)
    } catch (error) {
      // If 401 or any error, user is not authenticated
      setIsAuthenticated(false)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  return (
    <div className="app">
      <Routes>
        <Route 
          path="/" 
          element={
            isAuthenticated === true ? (
              <Navigate to="/playlists" replace />
            ) : (
              <LoginPage API_URL={API_URL} />
            )
          } 
        />
        <Route 
          path="/playlists" 
          element={
            isAuthenticated ? (
              <PlaylistsPage API_URL={API_URL} setIsAuthenticated={setIsAuthenticated} />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />
        <Route 
          path="/playlist/:id" 
          element={
            isAuthenticated ? (
              <PlaylistSongsPage API_URL={API_URL} setIsAuthenticated={setIsAuthenticated} />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />

        <Route
          path="/collection"
          element={
            isAuthenticated ? (
              <CollectionPage API_URL={API_URL} setIsAuthenticated={setIsAuthenticated} />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />
      </Routes>
    </div>
  )
}

export default App
