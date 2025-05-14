import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './AuthProvider';
import ProtectedRoute from './ProtectedRoute';
import AdminRoute from './AdminRoute';
import Login from './Login';
import Dashboard from './Dashboard';
import PuzzleView from './PuzzleView';
import Admin from './Admin';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <Admin />
              </AdminRoute>
            }
          />
          <Route path="/puzzle/:puzzleId" element={<ProtectedRoute><PuzzleView /></ProtectedRoute>} />
          <Route path="/*" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
