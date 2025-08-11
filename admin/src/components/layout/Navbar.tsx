// src/components/Navbar.tsx
import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="w-64 bg-gray-900 text-white p-4">
      <ul>
        <li><Link to="/">Dashboard</Link></li>
        <li><Link to="/users">Users</Link></li>
        <li><Link to="/campaigns">Campaigns</Link></li>
        <li><Link to="/moderation">Moderation</Link></li>
        <li><Link to="/posts">Posts</Link></li>
        <li><Link to="/settings">Settings</Link></li>
      </ul>
    </nav>
  );
}
