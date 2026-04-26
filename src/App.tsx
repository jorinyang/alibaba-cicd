import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import RegistrationForm from './pages/RegistrationForm'
import GroupResults from './pages/GroupResults'
import AdminPanel from './pages/AdminPanel'
import './index.css'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold text-indigo-900">工作坊智能分组系统</h1>
            <p className="text-gray-600 text-sm">武汉工作坊 · 100人10组智能分配</p>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<RegistrationForm />} />
            <Route path="/results" element={<GroupResults />} />
            <Route path="/admin" element={<AdminPanel />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
