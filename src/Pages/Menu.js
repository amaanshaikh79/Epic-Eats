import { useState, useEffect } from "react"
import { Link, useLocation } from "react-router-dom"
import { getMenuItems } from "../utils/api.js"
import { addToCart as addItemToCart, getCart, getCartTotal, getCartItemCount } from "../utils/cart.js"
import "../css/Menu.css"

// Exact display order for category tabs
const CATEGORY_ORDER = ['Pizza', 'Burger', 'Biryani', 'North Indian', 'Chinese', 'South Indian', 'Desserts', 'Rolls']

const Menu = () => {
  const location = useLocation()
  const queryParams = new URLSearchParams(location.search)
  const initialCategory = queryParams.get("category")

  const [menuData, setMenuData] = useState({})
  const [selectedCategory, setSelectedCategory] = useState(initialCategory || "Pizza")
  const [cartCount, setCartCount] = useState(0)
  const [cartTotal, setCartTotal] = useState(0)
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [addedItem, setAddedItem] = useState(null)

  // Fetch menu items from API
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        setLoading(true)
        const data = await getMenuItems()
        setMenuData(data.data)
        setError("")
      } catch (err) {
        setError("Failed to load menu. Please try again.")
        console.error("Menu fetch error:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchMenu()
    // Initialize cart counts
    setCartCount(getCartItemCount())
    setCartTotal(getCartTotal())
  }, [])

  // Use the predefined order, only showing categories that exist in API data
  const categories = CATEGORY_ORDER.filter(cat => menuData[cat])
  // Also append any extra API categories not in CATEGORY_ORDER
  const extraCategories = Object.keys(menuData).filter(cat => !CATEGORY_ORDER.includes(cat))
  const allCategories = [...categories, ...extraCategories]

  // Filter items based on search query
  const getFilteredItems = () => {
    const items = menuData[selectedCategory] || []
    if (!searchQuery) return items
    return items.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  const handleAddToCart = (item) => {
    if (item.stock <= 0) return
    addItemToCart(item)
    setCartCount(getCartItemCount())
    setCartTotal(getCartTotal())

    // Show "Added!" feedback
    setAddedItem(item._id)
    setTimeout(() => setAddedItem(null), 1200)
  }

  // Set first available category once data loads
  useEffect(() => {
    if (allCategories.length > 0) {
      // Find case-insensitive match for selectedCategory, useful if from URL
      const match = allCategories.find(c => c.toLowerCase() === selectedCategory.toLowerCase())
      
      if (match && match !== selectedCategory) {
        setSelectedCategory(match)
      } else if (!match && !allCategories.includes(selectedCategory)) {
        setSelectedCategory(allCategories[0])
      }
    }
  }, [allCategories, selectedCategory])

  if (loading) {
    return (
      <div className="menu-page">
        {/* Skeleton Search Bar */}
        <section className="swiggy-menu-search">
          <div className="search-container">
            <div className="sk-search-bar"></div>
          </div>
        </section>

        <section className="menu-content">
          <div className="menu-container">
            {/* Skeleton Filter Chips */}
            <div className="swiggy-filter-chips">
              {CATEGORY_ORDER.map((cat, i) => (
                <div key={i} className="swiggy-filter-chip sk-chip"></div>
              ))}
            </div>

            <div className="sk-title-bar"></div>

            {/* Skeleton Cards Grid */}
            <div className="swiggy-restaurant-grid">
              {Array(8).fill(0).map((_, i) => (
                <div className="swiggy-card skeleton-card" key={`sk-${i}`}>
                  <div className="swiggy-card-img-wrapper sk-img"></div>
                  <div className="swiggy-card-content">
                    <div className="sk-text" style={{ width: '75%', height: '18px' }}></div>
                    <div className="sk-text" style={{ width: '50%', height: '14px', marginTop: '10px' }}></div>
                    <div className="sk-text" style={{ width: '90%', height: '12px', marginTop: '10px' }}></div>
                    <div className="sk-text" style={{ width: '60px', height: '32px', marginTop: '14px', borderRadius: '8px' }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    )
  }

  if (error) {
    return (
      <div className="menu-page">
        <div className="menu-message-container">
          <h2 style={{ color: "#e43b4f" }}>Oops!</h2>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="menu-page">

      {/* Top Search Section */}
      <section className="swiggy-menu-search">
        <div className="search-container">
          <input
            type="text"
            className="swiggy-search-input"
            placeholder="Search for restaurants and food"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span className="swiggy-search-icon">🔍</span>
        </div>
      </section>

      {/* Menu Content */}
      <section className="menu-content">
        <div className="menu-container">

          {/* Category Tabs (Filter chips) */}
          <div className="swiggy-filter-chips">
            {allCategories.map(category => (
              <div
                key={category}
                className={`swiggy-filter-chip ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category)}
              >
                {category} {selectedCategory === category && <span>✕</span>}
              </div>
            ))}
          </div>

          <h2 className="swiggy-category-title">{selectedCategory || 'Menu'}</h2>

          {/* Menu Items Grid */}
          <div className="swiggy-restaurant-grid">
            {getFilteredItems().map(item => (
              <div key={item._id} className={`swiggy-card ${item.stock <= 0 ? 'out-of-stock' : ''}`}>

                {/* Item Image */}
                <div className="swiggy-card-img-wrapper">
                  <img src={item.image} alt={item.name} loading="lazy" />
                  <div className="item-badge-top">
                    {item.isVeg ? (
                       <span className="veg-badge-swiggy"><span className="veg-dot"></span></span>
                    ) : (
                       <span className="non-veg-badge-swiggy"><span className="non-veg-dot"></span></span>
                    )}
                  </div>
                  {item.stock <= 0 && (
                     <div className="oos-overlay">Out of Stock</div>
                  )}
                  {/* Optional Offer text based on price for realism */}
                  {item.price > 299 && <div className="offer-text">₹50 OFF</div>}
                  <div className="card-gradient"></div>
                </div>

                {/* Item Details */}
                <div className="swiggy-card-content">
                  <div className="name-and-price">
                     <h3>{item.name}</h3>
                     <span className="item-price">₹{item.price}</span>
                  </div>
                  <div className="rating-time">
                    <span className="rating-badge">⭐ {item.rating}</span>
                    <span className="dot">•</span>
                    <span className="time">30-35 mins</span>
                  </div>

                  <p className="cuisine-text">{item.description}</p>
                  
                  <div className="action-footer">
                     <button
                       className={`swiggy-add-btn ${addedItem === item._id ? 'added' : ''}`}
                       onClick={() => handleAddToCart(item)}
                       disabled={item.stock <= 0}
                     >
                       {item.stock <= 0 ? "SOLD OUT" : addedItem === item._id ? "ADDED" : "ADD"}
                     </button>
                  </div>
                </div>

              </div>
            ))}
          </div>

          {/* No Results Message */}
          {getFilteredItems().length === 0 && (
            <div className="no-results">
              <div className="no-results-img"></div>
              <h3>No match found for "{searchQuery}"</h3>
              <p>Please try searching for something else</p>
            </div>
          )}

        </div>
      </section>

      {/* Floating Cart Button */}
      {cartCount > 0 && (
        <div className="floating-cart">
          <Link to="/cart" className="cart-button">
            <div className="cart-info">
              <span className="cart-count">{cartCount} ITEM{cartCount !== 1 ? 'S' : ''}</span>
              <span className="cart-divider"></span>
              <span className="cart-total">₹{cartTotal}</span>
            </div>
            <span className="view-cart">
              View Cart <span>➔</span>
            </span>
          </Link>
        </div>
      )}

    </div>
  )
}

export default Menu