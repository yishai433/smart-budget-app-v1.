import React from 'react'
import ReactDOM from 'react-dom/client'
import './i18n'
import './index.css'
import App from './App'

const lang = localStorage.getItem('sb_lang') || 'he'
document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr'
document.documentElement.lang = lang

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
