import React, { useState } from "react";
import axios from "axios";
import FileBase from "react-file-base64";
import Header from "../header";
import './Sell.css';

const Sell = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState(null);
  const userName = localStorage.getItem("userName");

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Retrieve token from local storage
    const token = localStorage.getItem("token");

    if (!token) {
      alert("Please log in to create an item");
      return;
    }

    // Decode the token to get the user info (including collegeName)
    const decodedToken = JSON.parse(atob(token.split('.')[1])); // Decode JWT

    const collegeName = decodedToken.collegeName;  // Extract collegeName

    if (!collegeName) {
      alert("User college information is missing");
      return;
    }

    // Prepare form data
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('price', price);
    formData.append('image', image);
    formData.append('sellerName',userName);
    formData.append('collegeName', collegeName); // Add collegeName to the form data

    try {
      const response = await axios.post('http://localhost:4000/api/items/create', formData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // Send token for authentication
        },
      });
      console.log('Item created successfully:', response.data);
      alert('Item created successfully!');
      // Reset the form
      setTitle("");
      setDescription("");
      setPrice("");
      setImage(null);
    } catch (error) {
      console.error('Error uploading item:', error.response ? error.response.data : error.message);
      alert('Error creating item!');
    }
  };

  return (
    <div>
      <Header />
      <div className="sell-container">
        <div className="sell-content">
          <form onSubmit={handleSubmit} className="sell-form" encType="multipart/form-data">
            <h2>Enlist Your Item</h2>
            <div>
              <label>Title:</label>
              <input
                type="text"
                className="input-box"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div>
              <label>Description:</label>
              <textarea
                className="input-box"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
            <div>
              <label>Price:</label>
              <input
                type="number"
                className="input-box"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="upload-label">Upload Image:</label>
              <FileBase
                type="file"
                multiple={false}
                onDone={({ base64 }) => setImage(base64)}
              />
            </div>
            <button type="submit" className="sell-button">Submit</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Sell;
