import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { LessonsProvider } from './lessons/LessonsProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LessonsProvider>
      <App />
    </LessonsProvider>
  </StrictMode>,
)
