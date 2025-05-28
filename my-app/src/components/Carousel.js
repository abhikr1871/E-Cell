import React, { useState, useEffect } from "react";
import './Carousel.css';

function Carousel() {
    const places = [
        { img: "/assets/books.jpg" },
        { img: "/assets/cooler.jpg" },
        { img: "/assets/cycles.jpg" }
    ];

    const [currentIndex, setCurrentIndex] = useState(0);
    const totalSlides = places.length;

    const nextSlide = () => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % totalSlides);
    };

    useEffect(() => {
        const intervalId = setInterval(nextSlide, 3000); // Change image every 3 seconds

        return () => clearInterval(intervalId); // Cleanup interval on component unmount
    }, []);

    return (
        <div className="carousel">
            <div className="carousel-content">
                <img
                    className="carousel-image"
                    src={places[currentIndex].img}
                    alt={`Slide ${currentIndex + 1}`}
                />
            </div>
            <div className="controls">
                <button className="carousel-btn prev" onClick={() => setCurrentIndex((currentIndex - 1 + totalSlides) % totalSlides)}>
                    Previous
                </button>
                <button className="carousel-btn next" onClick={nextSlide}>
                    Next
                </button>
            </div>
            <div className="carousel-indicators">
                {places.map((_, index) => (
                    <span
                        key={index}
                        className={`indicator ${currentIndex === index ? "active" : ""}`}
                        onClick={() => setCurrentIndex(index)}
                    ></span>
                ))}
            </div>
        </div>
    );
}

export default Carousel;
