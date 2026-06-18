import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ApiKeyProvider } from './context/ApiKeyProvider'
import { ItemDetailProvider } from './context/ItemDetailProvider'
import { WatchlistProvider } from './context/WatchlistProvider'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ApiKeyProvider>
      <WatchlistProvider>
        <ItemDetailProvider>
          <App />
        </ItemDetailProvider>
      </WatchlistProvider>
    </ApiKeyProvider>
  </StrictMode>,
)
