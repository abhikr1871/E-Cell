// PrivateRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';

// Assuming you store authentication status in localStorage or any state management tool
const PrivateRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('token'); // Adjust this as needed

  return isAuthenticated ? children : <Navigate to="/Login" />;
};

export default PrivateRoute;
