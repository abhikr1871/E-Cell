import React, { useState, useEffect, useRef } from "react";
import "./Signup.css";
import Header from "../header";
import { signup } from "../../services/api";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../../context/Authcontext";
import axios from "axios";

const SignUp = () => {
  const { isAuthenticated, setIsAuthenticated } = useAuthContext();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const suggestionsRef = useRef(null);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/home");
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setSuggestions([]); // Hide suggestions if click is outside
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSignup = async () => {
    console.log("Sign Up:", { name, collegeName, email, password, confirmPassword });
    try {
      const response = await signup({ name, collegeName, email, password, confirmPassword });
      console.log("response", response);
      if (response?.data?.status === 1) {
        localStorage.setItem("token", response?.data?.data?.token);
        localStorage.setItem("userId", response?.data?.data?.user_id);
        localStorage.setItem("username", response?.data?.data?.name); // ✅ Save username
        setIsAuthenticated(true);
        navigate("/home");
      }
      window.alert(response?.data?.message);
    } catch (error) {
      console.error(error?.message);
    }
  };

  const handleCollegeNameChange = async (e) => {
    const value = e.target.value;
    setCollegeName(value);
    if (value) {
      try {
        const response = await axios.get(`http://universities.hipolabs.com/search?name=${value}&country=India`);
        setSuggestions(response.data);
      } catch (error) {
        console.error("Error fetching college suggestions:", error);
      }
    } else {
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = (name) => {
    setCollegeName(name);
    setSuggestions([]);
  };

  return (
    <div>
      <Header />
      <div className="signup-container">
        <div className="signup-content">
          <div className="signup-form">
            <h2>Welcome to College Cart</h2>
            <h2>Register</h2>
            <input
              className="input-box"
              type="text"
              value={name}
              required
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
            />
            <input
              className="input-box"
              type="text"
              value={collegeName}
              required
              onChange={handleCollegeNameChange}
              placeholder="College Name"
            />
            {suggestions.length > 0 && (
              <ul className="suggestions-list" ref={suggestionsRef}>
                {suggestions.map((college, index) => (
                  <li key={index} onClick={() => handleSuggestionClick(college.name)}>
                    {college.name}
                  </li>
                ))}
              </ul>
            )}
            <input
              className="input-box"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
            />
            <input
              className="input-box"
              type="password"
              value={password}
              required
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Set Password"
            />
            <input
              className="input-box"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm Password"
            />
            <button type="button" onClick={handleSignup} className="signup-button">
              Sign Up
            </button>
          </div>
          <div className="illustration">
            <img src="/assets/signup.jpeg" alt="Isometric Illustration" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
