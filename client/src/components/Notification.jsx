import './Notification.css'

function Notification({ message, onClose }) {
  return (
    <div className="notification">
      <div className="notification-content">
        <span>{message}</span>
        <button onClick={onClose} className="notification-close">×</button>
      </div>
    </div>
  )
}

export default Notification
