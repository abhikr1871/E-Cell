import Header from '../header';
import './Buy.css';
import React, { useState } from "react";
import Container from '../container';

function Buy() {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    return (
       <div className='buy_container'>
        <Header onNotificationClick={toggleSidebar} />
        <Container sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
       </div>
    );
}
export default Buy;