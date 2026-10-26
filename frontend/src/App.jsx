import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import ForecastView from './pages/ForecastView'
import AccuracyAnalysis from './pages/AccuracyAnalysis'
import ProcurementView from './pages/ProcurementView'
import './App.css'

export default function App() {
  const [activePage, setActivePage] = useState('dashboard')

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <Dashboard />
      case 'forecast': return <ForecastView />
      case 'accuracy': return <AccuracyAnalysis />
      case 'procurement': return <ProcurementView />
      default: return <Dashboard />
    }
  }

  return (
    <div className="app-container">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  )
}
