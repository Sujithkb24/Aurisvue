import { useState } from 'react'
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Landingpage from './components/pages/Landing page'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
     <Router>
      <Routes>
        <Route path="/" element={<Landingpage/>} />
        </Routes>
     
    </Router>
  )
}

export default App