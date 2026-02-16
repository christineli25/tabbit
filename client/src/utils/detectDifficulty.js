export async function detectDifficulty(accessToken, songId) {
    try {
        const response = await fetch(
            `https://api.spotify.com/v1/audio-features/${songId}`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        )

        if(!response.ok) {
            return 'intermediate';
        }

        const features = await response.json();

        const tempo = features.tempo || 120
        const energy = features.energy || 0.5
        
        let score = 0
        
        // Tempo scoring (more aggressive thresholds)
        if (tempo < 120) {
          score -= 2  // Easy indicator
        } else if (tempo > 120) {
          score += 2  // Hard indicator
        }
        
        // Energy scoring (more aggressive thresholds)
        if (energy < 0.5) {
          score -= 1  // Easy indicator
        } else if (energy > 0.5) {
          score += 1  // Hard indicator
        }
        
        // Categorize based on score (more aggressive - any negative is easy, any positive is hard)
        if (score < 0) {
          return 'easy'
        } else if (score > 0) {
          return 'hard'
        } else {
          // score === 0: use tempo as tiebreaker
          if (tempo < 115) {
            return 'easy'
          } else if (tempo > 125) {
            return 'hard'
          } else {
            return 'intermediate'
          }
        }
  } catch (error) {
    console.error('Error detecting difficulty:', error)
    return 'intermediate' // Default fallback
  }
}