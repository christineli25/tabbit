export function getCollection() {
    const saved = localStorage.getItem('tabbit-collection')
    return saved ? JSON.parse(saved) : []
}

export function saveToCollection(song, difficulty) {
    const collection = getCollection()
    
    // Check if song already exists
    const exists = collection.find(item => item.id === song.id)
    if (exists) {
        return false // Already saved
    }
    
    // Create song object with all needed data
    const songToSave = {
        id: song.id,
        name: song.name,
        artist: song.artists?.[0]?.name || 'Unknown Artist',
        album: song.album?.name || '',
        image: song.album?.images?.[0]?.url || '',
        spotifyUrl: song.external_urls?.spotify || '',
        songsterrUrl: song.songsterrUrl || '',
        difficulty: difficulty,
        dateAdded: new Date().toISOString()
    }
    
    // Add to collection
    collection.push(songToSave)
    
    // Save back to localStorage
    localStorage.setItem('tabbit-collection', JSON.stringify(collection))
    return true
}

export function isInCollection(songId) {
    const collection = getCollection()
    return collection.some(item => item.id === songId)
}

export function removeFromCollection(songId) {
    const collection = getCollection()
    const updatedCollection = collection.filter(item => item.id !== songId)
    localStorage.setItem('tabbit-collection', JSON.stringify(updatedCollection))
}

export function updateDifficulty(songId, difficulty) {
    const collection = getCollection()
    const updated = collection.map(song => {
      if (song.id === songId) {
        return { ...song, difficulty }
      }
      return song
    })
    localStorage.setItem('tabbit-collection', JSON.stringify(updated))
  }