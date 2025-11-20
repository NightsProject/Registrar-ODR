import React from "react";
import { Link } from "react-router-dom";

function Index() {
  return (
    <div style={{ padding: "20px" }}>
      <h2>Admin Links</h2>
      <ul>
        <li>
          <Link to="/user/Landing">User Landing Page</Link>
        </li>

        <li>
          <Link to="/admin/login">Admin Login</Link>
        </li>
      </ul>
    </div>
  );
}

export default Index;
