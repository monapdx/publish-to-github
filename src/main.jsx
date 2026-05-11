import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles/app.css'
import './styles/editor.css'
import './styles/toolbar.css'
import './styles/dialogs.css'
import './styles/toasts.css'
import './styles/onboarding.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
