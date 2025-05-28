import React, { useEffect, useState } from "react";
import "./container.css";
import Card from "./Card";
import Sidebar from "./Sidebar"; 
import { getItems } from "../services/api";
import socketManager from "../services/socket";
import useSocket from "../hooks/useSocket";

function Container({ sidebarOpen, setSidebarOpen }) {
  const [items, setItems] = useState([]); // Holds product items
  const [userId, setUserId] = useState(null); // Current user's ID
  const [userName, setUserName] = useState(""); // Current user's name
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get socket notifications
  const { notifications } = useSocket();

  // Load user details from localStorage
  useEffect(() => {
    const storedUserId = localStorage.getItem("userId");
    const storedUserName = localStorage.getItem("userName");

    if (storedUserId) setUserId(storedUserId);
    if (storedUserName) setUserName(storedUserName);
  }, []);

  // Fetch product items
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getItems();
      setItems(response?.data || []);
    } catch (error) {
      console.error("Error fetching items:", error?.message);
      setError("Failed to load products. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleSidebar = () => {
    if (setSidebarOpen) {
      setSidebarOpen(!sidebarOpen);
    }
  };

  if (loading) {
    return (
      <div className="container-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading amazing products...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-error">
        <div className="error-content">
          <h3>Oops! Something went wrong</h3>
          <p>{error}</p>
          <button onClick={fetchData} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Sidebar Component */}
      <Sidebar
        userName={userName}
        notifications={notifications}
        isOpen={sidebarOpen || false}
        onClose={() => setSidebarOpen && setSidebarOpen(false)}
        onToggle={toggleSidebar}
      />

      {/* Product Cards Container */}
      <div className="container">
        {items.length === 0 ? (
          <div className="no-products">
            <h3>No products available</h3>
            <p>Check back later for amazing deals!</p>
          </div>
        ) : (
          <div className="products-grid">
            {items.map((item) => (
              <Card
                key={item?._id || item?.id}
                item={item}
                userId={userId}
                userName={userName}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default Container;