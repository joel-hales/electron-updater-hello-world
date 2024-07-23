import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

try {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )

  // Use contextBridge
  window.ipcRenderer.on("main-process-message", (_event, message) => {
    console.log(message)
  })
  console.log("React app rendered successfully")
} catch (error) {
  console.error("Error rendering React app:", error)
}
