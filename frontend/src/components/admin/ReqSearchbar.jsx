import "./ReqSearchbar.css"

function ReqSearchbar({ onChange }) {
    return (
            <div className="req-search-bar-container">
                <img src="/assets/SearchIcon.svg" alt="Search Icon" className="search-icon" />
                <input
                    type="text"
                    className="search-input"
                    placeholder="Search Document"
                    onChange={(e) => onChange(e.target.value)}
                />
            </div>
    );
}

export default ReqSearchbar;