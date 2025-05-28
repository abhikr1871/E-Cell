import React, { useState, useEffect } from "react";
import Header from "../header";
import "./Login.css";
import { login, getNotifications } from "../../services/api"; // ✅ Use service for notifications
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from "../../context/Authcontext";
import socket from "../../services/socket";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function Login() {
  const { isAuthenticated, setIsAuthenticated } = useAuthContext();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/home");
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async () => {
    try {
      const response = await login({ email: username, password });
      const message = response?.data?.message;
      window.alert(message);

      if (response?.data?.status === 1) {
        const token = response?.data?.data?.token;
        const userId = response?.data?.data?.user_id;
        const userName = response?.data?.data?.name;

        // Save info
        localStorage.setItem("token", token);
        localStorage.setItem("userId", userId);
        localStorage.setItem("userName", userName);

        // Auth and socket
        setIsAuthenticated(true);
        setUsername("");
        setPassword("");
        socket.emit("userConnected", userId);

        // Notification fetch (with error-safe try block)
        try {
          const data = await getNotifications(userId);
          if (Array.isArray(data) && data.length > 0) {
            setNotifications(data);
            toast.info(`🔔 You have ${data.length} new message(s)! Click to view.`, {
              autoClose: false,
              onClick: () => navigate('/home?showNotifications=true'),
            });
          }
        } catch (notifError) {
          console.warn("📭 Notification fetch failed:", notifError.message);
        }

        // Navigate only once
        navigate("/home");
      } else {
        window.alert("Token not received. Please try again.");
      }
    } catch (error) {
      console.error(error?.message);
      window.alert("Login failed. Please check your credentials.");
    }
  };

  return (
    <div className="login-container">
      <Header />
      <div className="login-content">
        <div className="login-form">
          <h2>Welcome to College Cart</h2>
          <p>Sign into your account</p>
          <input
            className="input-box"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Email address"
          />
          <input
            className="input-box"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
          />
          <button type="button" onClick={handleLogin} className="login-button">
            Log In
          </button>
          <p className="forgot-password">Forgot password?</p>
        </div>
        <div className="illustration">
          <img src="/assets/LoginImage.png" alt="Isometric Illustration" />
        </div>
      </div>

      <ToastContainer position="top-right" />
    </div>
  );
}

export default Login;
