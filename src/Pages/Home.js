import { useState, useEffect, useContext, useRef } from "react"
import { Link, useNavigate } from "react-router-dom"
import { LocationContext } from "../context/LocationContext.js"
import { getMenuItems } from "../utils/api.js"
import FoodImage from "../components/FoodImage.js"
import "../css/Home.css"

const Home = () => {
  const navigate = useNavigate()
  const [menuItems, setMenuItems] = useState([])
  const [loading, setLoading] = useState(true)

  const { location: currentLoc, updateLocation } = useContext(LocationContext)
  const [locationQuery, setLocationQuery] = useState("")
  const [showDropdown, setShowDropdown] = useState(false)
  const [locating, setLocating] = useState(false)
  const dropdownRef = useRef(null)

  const indianCities = [
    "New Delhi, India", "Mumbai, India", "Bengaluru, India", 
    "Hyderabad, India", "Chennai, India", "Kolkata, India", 
    "Pune, India", "Ahmedabad, India", "Jaipur, India"
  ]

  // Hide dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleLocationSelect = (city) => {
    updateLocation(city)
    setLocationQuery("")
    setShowDropdown(false)
  }

  const handleLocateMe = () => {
    if ("geolocation" in navigator) {
      setLocating(true)
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            const data = await response.json();
            
            const city = data.address.city || data.address.town || data.address.state_district || "Unknown Location";
            updateLocation(`${city}, India`);
          } catch (error) {
            console.error("Geocoding failed", error);
            alert("Could not fetch location name. Please select manually.");
          } finally {
            setLocating(false)
          }
        },
        (error) => {
          console.error("Geolocation error", error);
          alert("Location access denied or unavailable.");
          setLocating(false)
        }
      )
    } else {
      alert("Geolocation is not supported by your browser.")
    }
  }

  // Categories data with food images Unsplash
  const categories = [
    { name: "Pizza", image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=150&q=80" },
    { name: "Burger", image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=150&q=80" },
    { name: "Biryani", image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=150&q=80" },
    { name: "North Indian", image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=150&q=80" },
    { name: "Chinese", image: "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=150&q=80" },
    { name: "South Indian", image: "https://images.unsplash.com/photo-1630383249896-424e482df921?auto=format&fit=crop&w=150&q=80" },
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
              <div className="location-input-wrapper" ref={dropdownRef}>
                <span className="location-icon">📍</span>
                <input 
                  type="text" 
                  placeholder={currentLoc || "Enter your delivery location"} 
                  className="location-input" 
                  value={locationQuery}
                  onChange={(e) => {
                    setLocationQuery(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                />
                <span className="locate-me" onClick={handleLocateMe}>
                  {locating ? "Locating..." : "Locate Me"}
                </span>
                
                {showDropdown && (
                  <div className="location-dropdown">
                    {indianCities
                      .filter(city => city.toLowerCase().includes(locationQuery.toLowerCase()))
                      .map((city, idx) => (
                        <div 
                          key={idx} 
                          className="location-dropdown-item"
                          onClick={() => handleLocationSelect(city)}
                        >
                          <span className="dropdown-icon">📍</span> {city}
                        </div>
                    ))}
                    {indianCities.filter(c => c.toLowerCase().includes(locationQuery.toLowerCase())).length === 0 && (
                        <div className="location-dropdown-item no-match">No matching cities found</div>
                    )}
                  </div>
                )}
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
              <div className="mind-category-item" key={idx} onClick={() => navigate(`/menu?category=${cat.name}`)}>
                <div className="circular-img-wrapper">
                  <img src={cat.image} alt={cat.name} loading="lazy" />
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
               <div className="swiggy-card" key={`featured-${item._id}`} onClick={() => navigate(`/menu?category=${item.category}`)}>
                  <div className="swiggy-card-img-wrapper">
                     <FoodImage src={item.image} alt={item.name} category={item.category} />
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
                <div className="swiggy-card" key={item._id} onClick={() => navigate(`/menu?category=${item.category}`)}>
                  <div className="swiggy-card-img-wrapper">
                     <FoodImage src={item.image} alt={item.name} category={item.category} />
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