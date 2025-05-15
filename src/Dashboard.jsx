// src/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { fetchWordSets } from './firestore';
import { useNavigate, Routes, Route, useParams } from 'react-router-dom';
import Crossword from '@jaredreisinger/react-crossword';
import PuzzleView from './PuzzleView';
import PreMadePuzzlesPage from './PreMadePuzzlesPage';

const PUZZLE_SIZES = [10, 15, 20, 25, 30];

function DashboardMain() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      await fetchWordSets();
      setLoading(false);
    }
    if (user) loadData();
  }, [user]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (loggingOut) return <div>Logging out...</div>;

  return (
    <div className="dashboard-container fade-in">
      <div className="dashboard-section" style={{marginBottom: 0}}>
        <h2 style={{fontSize: '2.2em', marginBottom: 0}}>
          Welcome, {user?.email}
        </h2>
        
        <div>
          <button onClick={() => navigate('/crossworder/premade')}>Load Pre-made Crossword Puzzle</button>
        </div>
        <div style={{margin: '1.5em 0'}}>
          <button onClick={handleLogout}>Log out</button>
          {user?.admin && (
            <button style={{marginLeft: 16}} onClick={() => navigate('/crossworder/admin')}>
              Admin
            </button>
          )}
        </div>
      </div>

      
    </div>
  );
}

export default function DashboardWrapper() {
  return (
    <Routes>
      <Route path="/" element={<DashboardMain />} />
      <Route path="/premade" element={<PreMadePuzzlesPage />} />
      <Route path="/fullpuzzle/:puzzleId" element={<FullPuzzleView />} />
    </Routes>
  );
}

function FullPuzzleView() {
  const { puzzleId } = useParams();
  let puzzle = null;
  try {
    puzzle = JSON.parse(sessionStorage.getItem('selectedFullPuzzle'));
  } catch {
    puzzle = null;
  }
  if (!puzzle || puzzle.id !== puzzleId) {
    return <div>Puzzle not found or not loaded from dashboard.</div>;
  }
  const crosswordData = puzzle.data || puzzle;
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <h2>{puzzle.title || 'Pre-made Puzzle'}</h2>
      <Crossword data={crosswordData} />
    </div>
  );
}
