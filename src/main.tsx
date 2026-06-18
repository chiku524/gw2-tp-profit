import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ApiKeyProvider } from './context/ApiKeyProvider'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ApiKeyProvider>
      <App />
    </ApiKeyProvider>
  </StrictMode>,
)
