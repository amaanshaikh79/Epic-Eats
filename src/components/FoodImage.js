import { useState, useCallback } from "react"

// Category-specific fallback images (all verified working)
const CATEGORY_FALLBACKS = {
    "Pizza": "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=500&q=80",
    "Burger": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80",
    "Biryani": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&q=80",
    "North Indian": "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=500&q=80",
    "Chinese": "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500&q=80",
    "South Indian": "https://images.unsplash.com/photo-1630383249896-424e482df921?w=500&q=80",
    "Desserts": "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=500&q=80",
    "Rolls": "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=500&q=80",
}

// Generic food fallback
const GENERIC_FALLBACK = "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=500&q=80"

/**
 * FoodImage — Drop-in replacement for <img> that handles broken image URLs
 * gracefully with category-aware fallbacks.
 */
const FoodImage = ({ src, alt, category, className, loading = "lazy", ...rest }) => {
    const [imgSrc, setImgSrc] = useState(src)
    const [retried, setRetried] = useState(false)

    const handleError = useCallback(() => {
        if (!retried) {
            // First fallback: use category-specific image
            const fallback = CATEGORY_FALLBACKS[category] || GENERIC_FALLBACK
            setImgSrc(fallback)
            setRetried(true)
        } else {
            // Final fallback: generic food image
            setImgSrc(GENERIC_FALLBACK)
        }
    }, [category, retried])

    return (
        <img
            src={imgSrc}
            alt={alt}
            className={className}
            loading={loading}
            onError={handleError}
            {...rest}
        />
    )
}

export { CATEGORY_FALLBACKS, GENERIC_FALLBACK }
export default FoodImage
