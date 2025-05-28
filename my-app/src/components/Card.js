import React, { useState } from "react";
import "./Card.css";
import { MessageCircle, Heart, Share2, Star, MapPin } from "lucide-react";
import { toast } from 'react-toastify';

function Card({ item, userId, userName }) {
  const [isLiked, setIsLiked] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Handle "Chat with Seller" button click
  const handleChatClick = () => {
    if (!userId) {
      toast.error("Please login to chat with sellers");
      return;
    }

    if (!item?.sellerId) {
      toast.error("Seller information not available");
      return;
    }

    if (item.sellerId === userId) {
      toast.info("You cannot chat with yourself");
      return;
    }

    // Emit a custom event that App.js can listen to
    const chatEvent = new CustomEvent('openChat', {
      detail: {
        sellerId: item.sellerId,
        sellerName: item.sellerName || 'Unknown Seller',
        chatboxId: [userId, item.sellerId].sort().join('_')
      }
    });
    window.dispatchEvent(chatEvent);
    
    toast.success(`Opening chat with ${item.sellerName || 'seller'}`);
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    toast.success(isLiked ? "Removed from favorites" : "Added to favorites");
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: item?.title,
          text: item?.description,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Link copied to clipboard!");
      }
    } catch (error) {
      toast.error("Failed to share");
    }
  };

  const formatPrice = (price) => {
    if (!price) return "Price not available";
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <div className="product-card">
      <div className="card-header">
        <div className="image-container">
          {!imageLoaded && (
            <div className="image-placeholder">
              <div className="loading-shimmer"></div>
            </div>
          )}
          <img
            className={`product-image ${imageLoaded ? 'loaded' : ''}`}
            src={item?.image || '/api/placeholder/300/200'}
            alt={item?.title || "Product Image"}
            onLoad={() => setImageLoaded(true)}
            onError={(e) => {
              e.target.src = '/api/placeholder/300/200';
              setImageLoaded(true);
            }}
          />
          <div className="card-actions">
            <button 
              className={`action-btn like-btn ${isLiked ? 'liked' : ''}`}
              onClick={handleLike}
              aria-label="Add to favorites"
            >
              <Heart size={18} fill={isLiked ? 'currentColor' : 'none'} />
            </button>
            <button 
              className="action-btn share-btn"
              onClick={handleShare}
              aria-label="Share product"
            >
              <Share2 size={18} />
            </button>
          </div>
          {item?.featured && (
            <div className="featured-badge">
              <Star size={14} />
              Featured
            </div>
          )}
        </div>
      </div>

      <div className="card-content">
        <div className="product-header">
          <h3 className="product-title">{item?.title || "Product Title"}</h3>
          <div className="product-rating">
            <Star size={14} fill="currentColor" />
            <span>{item?.rating || "4.5"}</span>
          </div>
        </div>

        <div className="product-location">
          <MapPin size={14} />
          <span>{item?.location || "Location not specified"}</span>
        </div>

        <p className="product-description">
          {item?.description || "No description available"}
        </p>

        <div className="product-price">
          <span className="current-price">
            {formatPrice(item?.price)}
          </span>
          {item?.originalPrice && item.originalPrice > item.price && (
            <>
              <span className="original-price">
                {formatPrice(item.originalPrice)}
              </span>
              <span className="discount">
                {Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)}% off
              </span>
            </>
          )}
        </div>

        <div className="product-meta">
          <div className="seller-info">
            <div className="seller-avatar">
              {(item?.sellerName || 'U')[0].toUpperCase()}
            </div>
            <div className="seller-details">
              <span className="seller-name">
                {item?.sellerName || "Unknown Seller"}
              </span>
              <span className="seller-status">Online now</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card-footer">
        <button 
          className="chat-btn"
          onClick={handleChatClick}
          disabled={!userId || item?.sellerId === userId}
        >
          <MessageCircle size={18} />
          Chat with Seller
        </button>
        <button className="buy-btn">
          Buy Now
        </button>
      </div>
    </div>
  );
}

export default Card;