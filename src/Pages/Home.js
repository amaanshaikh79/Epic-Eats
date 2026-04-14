import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { getMenuItems } from "../utils/api.js"
import "../css/Home.css"

const Home = () => {
  const navigate = useNavigate()
  const [menuItems, setMenuItems] = useState([])
  const [loading, setLoading] = useState(true)

  // Categories data with food images Unsplash
  const categories = [
    { name: "Pizza", image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=150&q=80" },
    { name: "Burgers", image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=150&q=80" },
    { name: "Biryani", image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=150&q=80" },
    { name: "North Indian", image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=150&q=80" },
    { name: "Chinese", image: "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=150&q=80" },
    { name: "South Indian", image: "https://images.unsplash.com/photo-1610192244261-3f339f16d1de?auto=format&fit=crop&w=150&q=80" },
    { name: "Desserts", image: "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=150&q=80" },
    { name: "Rolls", image: "https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=150&q=80" },
  ]

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        setLoading(true)
        const response = await getMenuItems({ limit: 12 })
        // Flatten the data object since it is grouped by category from the API
        let allItems = []
        if (response.data) {
           Object.values(response.data).forEach(categoryItems => {
               allItems = [...allItems, ...categoryItems]
           })
        }
        setMenuItems(allItems.slice(0, 12)) // Just taking 12 items for the home page
      } catch (err) {
        console.error("Failed to fetch menu items", err)
      } finally {
        setLoading(false)
      }
    }
    fetchMenu()
  }, [])

  return (
    <div className="home-container">
      {/* ── Swiggy Hero Section ── */}
      <div className="swiggy-hero">
        <div className="hero-left">
          <div className="hero-text-container">
            <h1 className="swiggy-headline">
              Order food & groceries. Discover <br /> best restaurants. EPIC EATS it!
            </h1>
            <div className="swiggy-search-box">
              <div className="location-input-wrapper">
                <span className="location-icon">📍</span>
                <input type="text" placeholder="Enter your delivery location" className="location-input" />
                <span className="locate-me">Locate Me</span>
              </div>
              <div className="search-input-wrapper" onClick={() => navigate('/menu')}>
                <input type="text" placeholder="Search for restaurant, item or more" readOnly />
                <span className="search-icon">🔍</span>
              </div>
            </div>
          </div>
        </div>
        <div className="hero-right">
          <img src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80" className="hero-food-img" alt="Delicious Food" />
        </div>
      </div>

      <div className="main-content-wrapper">
        {/* ── What's on your mind? ── */}
        <section className="mind-section">
          <div className="section-header">
            <h2>What's on your mind?</h2>
          </div>
          <div className="category-carousel">
            {categories.map((cat, idx) => (
              <div className="mind-category-item" key={idx} onClick={() => navigate('/menu')}>
                <div className="circular-img-wrapper">
                  <img src={cat.image} alt={cat.name} />
                </div>
                <p>{cat.name}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Divider */}
        <div className="section-divider"></div>

        {/* ── Top restaurant chains in [Location] (Featured) ── */}
        <section className="featured-section">
          <div className="section-header">
            <h2>Top restaurant chains in Delhi</h2>
          </div>
          <div className="restaurant-carousel">
             {!loading && menuItems.slice(0, 4).map((item) => (
               <div className="swiggy-card" key={`featured-${item._id}`} onClick={() => navigate('/menu')}>
                  <div className="swiggy-card-img-wrapper">
                     <img src={item.image} alt={item.name} />
                     <div className="card-gradient"></div>
                     <div className="offer-text">₹100 OFF ABOVE ₹299</div>
                  </div>
                  <div className="swiggy-card-content">
                     <h3>{item.name}</h3>
                     <div className="rating-time">
                        <span className="rating-badge">⭐ {item.rating}</span>
                        <span className="dot">•</span>
                        <span className="time">25-30 mins</span>
                     </div>
                     <p className="cuisine-text">{item.category}, North Indian</p>
                     <p className="location-text">New Delhi</p>
                  </div>
               </div>
             ))}
             {loading && Array(4).fill(0).map((_, i) => (
                 <div className="swiggy-card skeleton-card" key={`sk-feat-${i}`}>
                    <div className="sk-img"></div>
                    <div className="sk-text" style={{width: '80%'}}></div>
                    <div className="sk-text" style={{width: '50%'}}></div>
                 </div>
             ))}
          </div>
        </section>

        {/* Divider */}
        <div className="section-divider"></div>

        {/* ── Restaurants with online food delivery ── */}
        <section className="all-restaurants-section">
          <h2>Restaurants with online food delivery</h2>
          
          <div className="filter-chips">
            <div className="filter-chip">Filter <span><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"></path></svg></span></div>
            <div className="filter-chip">Sort By <span>&#x25BE;</span></div>
            <div className="filter-chip">Fast Delivery</div>
            <div className="filter-chip">New on Epic Eats</div>
            <div className="filter-chip">Ratings 4.0+</div>
            <div className="filter-chip">Pure Veg</div>
            <div className="filter-chip">Offers</div>
            <div className="filter-chip">Rs. 300-Rs. 600</div>
            <div className="filter-chip">Less than Rs. 300</div>
          </div>

          <div className="restaurant-grid">
             {!loading && menuItems.map((item) => (
                <div className="swiggy-card" key={item._id} onClick={() => navigate('/menu')}>
                  <div className="swiggy-card-img-wrapper">
                     <img src={item.image} alt={item.name} />
                     <div className="card-gradient"></div>
                     <div className="offer-text">ITEMS AT ₹129</div>
                  </div>
                  <div className="swiggy-card-content">
                     <h3>{item.name}</h3>
                     <div className="rating-time">
                        <span className="rating-badge">⭐ {item.rating}</span>
                        <span className="dot">•</span>
                        <span className="time">30-35 mins</span>
                     </div>
                     <p className="cuisine-text">{item.category}, Snacks</p>
                     <p className="location-text">Connaught Place</p>
                  </div>
               </div>
             ))}
             {loading && Array(8).fill(0).map((_, i) => (
                 <div className="swiggy-card skeleton-card" key={`sk-all-${i}`}>
                    <div className="sk-img"></div>
                    <div className="sk-text" style={{width: '80%', height: '18px', marginTop: '12px'}}></div>
                    <div className="sk-text" style={{width: '50%', height: '14px', marginTop: '8px'}}></div>
                 </div>
             ))}
          </div>

        </section>

      </div>
    </div>
  )
}

export default Home