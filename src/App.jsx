import { Routes, Route } from 'react-router-dom'
import AuraFlowLanding from './homepage.jsx'
import AurexStudio from './studio.jsx'
import HowItWorks from './howitworks.jsx'
import Documentation from './documentation.jsx'
import LocalizationPage from './LocalizationPage.jsx'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<AuraFlowLanding />} />
      <Route path="/studio" element={<AurexStudio />} />
      <Route path="/how-it-works" element={<HowItWorks />} />
      <Route path="/documentation" element={<Documentation />} />
      <Route path="/localize" element={<LocalizationPage />} />
    </Routes>
  )
}

export default App
