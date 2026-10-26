import { LayoutDashboard, Wind, BarChart3, ShoppingCart, Zap } from 'lucide-react'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'forecast', label: 'Forecast View', icon: Wind },
  { id: 'accuracy', label: 'Accuracy Analysis', icon: BarChart3 },
  { id: 'procurement', label: 'Procurement', icon: ShoppingCart },
]

export default function Sidebar({ activePage, setActivePage }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">
          <Zap size={22} color="#000" fill="#000" />
        </div>
        <h1>WindTrack</h1>
        <span>UK Energy Intelligence</span>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Navigation</div>
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <div
            key={id}
            id={`nav-${id}`}
            className={`nav-item ${activePage === id ? 'active' : ''}`}
            onClick={() => setActivePage(id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setActivePage(id)}
          >
            <span className="nav-icon"><Icon size={16} /></span>
            <span>{label}</span>
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="data-source-badge">
          <div className="pulse-dot" />
          <span>Elexon BMRS Live</span>
        </div>
      </div>
    </aside>
  )
}
