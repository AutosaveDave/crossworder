// src/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { useNavigate, Routes, Route } from 'react-router-dom';
import Crossword from '@jaredreisinger/react-crossword';
import PreMadePuzzlesPage from './PreMadePuzzlesPage';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import FullPuzzleView from './FullPuzzleView';

function DashboardMain() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [userPremadeProgress, setUserPremadeProgress] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      if (user) {
        // Fetch all premadeProgress docs for this user
        const q = query(
          collection(db, 'premadeProgress'),
          where('userId', '==', user.uid)
        );
        const snapshot = await getDocs(q);
        let progress = snapshot.docs.map(docSnap => ({
          ...docSnap.data(),
          id: docSnap.id,
        }));
        // Fetch titles for each fullPuzzleId
        const titleMap = {};
        await Promise.all(progress.map(async (p) => {
          if (p.fullPuzzleId) {
            const puzzleDoc = await getDoc(doc(db, 'fullPuzzles', p.fullPuzzleId));
            titleMap[p.fullPuzzleId] = puzzleDoc.exists() ? puzzleDoc.data().title || p.fullPuzzleId : p.fullPuzzleId;
          }
        }));
        // Attach title to each progress entry
        progress = progress.map(p => ({ ...p, title: titleMap[p.fullPuzzleId] || p.fullPuzzleId }));
        setUserPremadeProgress(progress.sort((a, b) => new Date(b.lastSaved?.toDate?.() || b.lastSaved) - new Date(a.lastSaved?.toDate?.() || a.lastSaved)));
      }
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
        {/* Pre-made puzzle progress list */}
        {userPremadeProgress.length > 0 && (
          <div style={{margin: '1.5em 0'}}>
            <h3>Your Pre-made Puzzle Progress</h3>
            <ul style={{listStyle: 'none', padding: 0}}>
              {userPremadeProgress.map(p => (
                <li key={p.fullPuzzleId} style={{marginBottom: 10, display: 'flex', alignItems: 'center'}}>
                  <span style={{fontWeight: 600, flex: 2}}>{p.title || p.fullPuzzleId}</span>
                  <span style={{marginLeft: 12, color: '#645e4f', fontSize: '0.95em', flex: 1}}>
                    {p.lastSaved ? (p.lastSaved.toDate ? p.lastSaved.toDate().toLocaleString() : new Date(p.lastSaved).toLocaleString()) : ''}
                  </span>
                  <button style={{marginLeft: 12}} onClick={() => navigate(`/crossworder/fullpuzzle/${p.fullPuzzleId}`)}>
                    Continue
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
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
