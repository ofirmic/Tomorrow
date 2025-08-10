import { NavLink } from 'react-router-dom'

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">Weather Alerts</div>
      <nav className="side-menu">
        <NavLink to="/" end>Home</NavLink>
        <NavLink to="/alerts">Alerts</NavLink>
        <NavLink to="/state">Current State</NavLink>
      </nav>
      <div className="side-footer">Tomorrow.io Demo</div>
    </aside>
  )
}


