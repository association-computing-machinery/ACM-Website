import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { AuthProvider } from './auth/AuthContext'
import { SiteProvider } from './context/SiteContext'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SiteProvider>
      <AuthProvider><App /></AuthProvider>
    </SiteProvider>
  </React.StrictMode>,
)
