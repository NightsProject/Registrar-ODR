import React, { useState } from "react";
import "./ReqSearchbar.css"

function ReqSearchbar({ onSearch }) {
    const [query, setQuery] = useState('');

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            onSearch(query);
        }
    };

    const handleSearch = () => {
        onSearch(query);
    };

    return (
            <div className="req-search-bar">
                <div className="req-search-bar-container">
                  
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search Request"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyPress={handleKeyPress}
                    />
                </div>
                 <button onClick={handleSearch} className="search-button">
                      <img src="/assets/SearchIcon.svg" alt="Search Icon" className="search-icon" />
                 </button>
            </div>
    );
}

export default ReqSearchbar;
