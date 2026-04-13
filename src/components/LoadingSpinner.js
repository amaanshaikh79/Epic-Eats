import "../css/LoadingSpinner.css"

const LoadingSpinner = () => {
  return (
    <div className="loading-spinner-overlay" id="loading-spinner">
      <div className="loading-spinner-container">
        <div className="spinner-ring">
          <div className="spinner-ring-inner"></div>
        </div>
        <p className="loading-text">Loading...</p>
      </div>
    </div>
  )
}

export default LoadingSpinner
