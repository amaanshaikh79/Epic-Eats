import { Link, useNavigate } from "react-router-dom"
import "../css/Home.css"


const Home = () => {
  const navigate = useNavigate()

  return (
    <div className="home">

      {/* ── Hero Section ── */}
      <div className="hero">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-headline">
              Hungry? <span className="highlight">Order</span> your<br />
              favourite food, instantly.
            </h1>
            <p className="hero-desc">
              Discover restaurants around you and get your meals delivered
              in minutes. Fresh, fast and always delicious.
            </p>
            <div className="hero-search">
              <input
                type="text"
                placeholder="Search for restaurants, cuisines..."
                className="hero-search-input"
                readOnly
                onClick={() => navigate('/menu')}
              />
              <button
                className="hero-search-btn"
                onClick={() => navigate('/menu')}
              >
                Find Food
              </button>
            </div>
          </div>
          <div className="hero-image">
            <img
              src="https://images.unsplash.com/photo-1504674900247-0877df9cc836"
              alt="Delicious food platter"
            />
          </div>
        </div>
      </div>

      {/* ── Category Strip ── */}
      <div className="category-strip">
        <h2 className="section-heading">
          What's on your mind?
        </h2>
        <div className="category-scroll">
          {[
            { emoji: "🍕", label: "Pizza" },
            { emoji: "🍔", label: "Burgers" },
            { emoji: "🍗", label: "Chicken" },
            { emoji: "🍜", label: "Noodles" },
            { emoji: "🍛", label: "Biryani" },
            { emoji: "🥗", label: "Salads" },
            { emoji: "🧁", label: "Desserts" },
            { emoji: "☕", label: "Drinks" },
          ].map((cat) => (
            <Link
              to="/menu"
              className="category-item"
              key={cat.label}
            >
              <span className="cat-emoji">{cat.emoji}</span>
              <span className="cat-label">{cat.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Info Banner ── */}
      <div className="info-banner">
        <div className="info-banner-inner">
          <div className="info-stat">
            <span className="info-number">500+</span>
            <span className="info-label">Restaurants</span>
          </div>
          <div className="info-divider" />
          <div className="info-stat">
            <span className="info-number">30 min</span>
            <span className="info-label">Avg Delivery</span>
          </div>
          <div className="info-divider" />
          <div className="info-stat">
            <span className="info-number">1M+</span>
            <span className="info-label">Happy Orders</span>
          </div>
          <div className="info-divider" />
          <div className="info-stat">
            <span className="info-number">4.8 ★</span>
            <span className="info-label">App Rating</span>
          </div>
        </div>
      </div>

      {/* ── Why Choose Section ── */}
      <div className="features">
        <h2 className="section-heading">Why Choose <span className="highlight">EPIC EATS</span>?</h2>

        <div className="feature-cards">
          <div className="card">
            <div className="card-icon">⚡</div>
            <h4>Superfast Delivery</h4>
            <p>Get your food delivered within 30 minutes, hot and fresh to your doorstep. Live order tracking included.</p>
          </div>

          <div className="card">
            <div className="card-icon">🏆</div>
            <h4>Best Restaurants</h4>
            <p>We partner with 500+ top rated restaurants to bring you the best quality meals in town.</p>
          </div>

          <div className="card">
            <div className="card-icon">💳</div>
            <h4>Easy Payments</h4>
            <p>UPI, Cards and Cash on Delivery — pay the way you prefer, completely hassle-free.</p>
          </div>

          <div className="card">
            <div className="card-icon">🛡️</div>
            <h4>Safe & Hygienic</h4>
            <p>All restaurant partners follow strict hygiene protocols. Your safety is our top priority.</p>
          </div>
        </div>
      </div>

      {/* ── CTA Banner ── */}
      <div className="cta-banner">
        <div className="cta-inner">
          <h2>Ready to order?</h2>
          <p>Browse our full menu and discover something delicious today.</p>
          <Link to="/menu" className="cta-btn">Explore Menu →</Link>
        </div>
      </div>

    </div>
  )
}

export default Home