import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ScAuthProvider } from './context/ScAuthContext.jsx'
import './assets/css/index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ScAuthProvider>
        <App />
      </ScAuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
