import React from "react";
import ReactDom from "react-dom";

import './Searchbar.css';


function Searchbar(){
    return (
        <div  className="Search">
            <h1>Search</h1>
        <input className="inputboxsearch"
         type="text"
         placeholder="e.g Cooler , Books , Cycle"
        />
          
            
        </div>
         
        
    )}

    export default Searchbar;
