import './Header.css'

function Header({ API_URL }) {
    const handleLogout = () => {
        // Full page redirect to server - browser sends session cookie, no CORS issues
        const apiUrl = API_URL || 'http://127.0.0.1:8000'
        const returnTo = encodeURIComponent(window.location.origin + '/')
        window.location.href = `${apiUrl}/auth/logout?returnTo=${returnTo}`
    }
    
    return (
        <div className="header">
            <button type="button" className="profile-button" onClick={handleLogout} aria-label="Logout">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="18" height="18">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M16 17l5-5-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Log out</span>
            </button>
        </div>
    )
}

export default Header