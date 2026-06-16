import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { GacAuthProvider } from './context/GacAuthContext.jsx'
import './assets/css/index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <GacAuthProvider>
        <App />
      </GacAuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
