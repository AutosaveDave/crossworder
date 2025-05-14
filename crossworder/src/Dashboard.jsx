// src/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { fetchWordSets, fetchUserPuzzles, saveUserPuzzle } from './firestore';
import { v4 as uuidv4 } from 'uuid';
import crosswordLayoutGenerator from 'crossword-layout-generator';
import { useNavigate, Routes, Route, useParams } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import Crossword from '@jaredreisinger/react-crossword';
import PuzzleView from './PuzzleView';

const PUZZLE_SIZES = [10, 15, 20, 25, 30];

function DashboardMain(props) {
  const { user, logout } = useAuth();
  const [wordSets, setWordSets] = useState([]);
  const [puzzles, setPuzzles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [size, setSize] = useState(PUZZLE_SIZES[0]);
  const [generating, setGenerating] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [fullPuzzles, setFullPuzzles] = useState([]);
  const [loadingFullPuzzles, setLoadingFullPuzzles] = useState(false);
  const [selectedFullPuzzle, setSelectedFullPuzzle] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [ws, ps] = await Promise.all([
        fetchWordSets(),
        fetchUserPuzzles(user.uid)
      ]);
      setWordSets(ws);
      setPuzzles(ps);
      setLoading(false);
    }
    if (user) loadData();

    // Fetch full puzzles
    async function fetchFullPuzzles() {
      setLoadingFullPuzzles(true);
      try {
        const snapshot = await getDocs(collection(db, 'fullPuzzles'));
        setFullPuzzles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e) {
        // Optionally handle error
      }
      setLoadingFullPuzzles(false);
    }
    fetchFullPuzzles();
  }, [user]);

  async function handleGeneratePuzzle(e) {
    e.preventDefault();
    setGenerating(true);
    // Gather all words from wordSets, respecting weighting
    let allWords = [];
    wordSets.forEach(set => {
      const count = Math.round(set.weighting * size * size / 2); // crude estimate
      const shuffled = set.words.slice().sort(() => 0.5 - Math.random());
      allWords.push(...shuffled.slice(0, count));
    });
    // Generate crossword layout
    let layout;
    try {
      layout = crosswordLayoutGenerator({
        entries: allWords.map(w => ({
          answer: w.word.toUpperCase(),
          clue: w.clue
        })),
        gridSize: size
      });
    } catch {
      setGenerating(false);
      alert('Failed to generate puzzle. Try a different size or word set.');
      return;
    }
    const newPuzzle = {
      id: uuidv4(),
      size,
      dateCreated: new Date().toISOString(),
      lastAccessed: new Date().toISOString(),
      percentComplete: 0,
      layout,
      usedWords: layout.entries.map(e => e.answer),
    };
    await saveUserPuzzle(user.uid, newPuzzle);
    setPuzzles(prev => [...prev, newPuzzle]);
    setGenerating(false);
  }

  function handleLoadPuzzle(puzzleId) {
    navigate(`/puzzle/${puzzleId}`);
  }

  function handleLoadFullPuzzle(puzzle) {
    // Save the selected full puzzle to sessionStorage and navigate to a new route
    sessionStorage.setItem('selectedFullPuzzle', JSON.stringify(puzzle));
    navigate(`/fullpuzzle/${puzzle.id}`);
  }

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
    <div>
      <h2>Welcome, {user?.email}</h2>
      <button onClick={handleLogout}>Log out</button>
      {user?.admin && (
        <button style={{marginLeft: 16}} onClick={() => navigate('/admin')}>
          Admin
        </button>
      )}
      <hr />
      <h3>Generate New Puzzle</h3>
      <form onSubmit={handleGeneratePuzzle} style={{ marginBottom: 24 }}>
        <label>
          Puzzle Size:
          <select value={size} onChange={e => setSize(Number(e.target.value))}>
            {PUZZLE_SIZES.map(s => (
              <option key={s} value={s}>{s} x {s}</option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={generating} style={{ marginLeft: 12 }}>
          {generating ? 'Generating...' : 'Generate'}
        </button>
      </form>
      <h3>Word Sets</h3>
      <ul>
        {wordSets.map(set => (
          <li key={set.id}>{set.category} (weight: {set.weighting})</li>
        ))}
      </ul>
      <h3>Saved Puzzles</h3>
      <ul>
        {puzzles.length === 0 && <li>No saved puzzles yet.</li>}
        {puzzles.length > 0 ? puzzles.map(p => (
          <li key={p.id}>
            {p.size}x{p.size} - {p.dateCreated} - {p.percentComplete || 0}% complete
            <button style={{marginLeft: 8}} onClick={() => handleLoadPuzzle(p.id)}>Continue</button>
          </li>
        )) : null}
      </ul>
      <hr />
      <div>
        <h3>Load Pre-made Crossword Puzzle</h3>
        {loadingFullPuzzles ? (
          <div>Loading full puzzles...</div>
        ) : (
          <>
            {fullPuzzles.length === 0 && <div>No pre-made puzzles available.</div>}
            {fullPuzzles.length > 0 && (
              <ul>
                {fullPuzzles.map(p => (
                  <li key={p.id}>
                    {p.title || p.id}
                    <button style={{marginLeft: 8}} onClick={() => handleLoadFullPuzzle(p)}>
                      Load
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {selectedFullPuzzle && (
              <div style={{marginTop: 24}}>
                <h4>Preview: {selectedFullPuzzle.title || selectedFullPuzzle.id}</h4>
                <div style={{maxWidth: 600}}>
                  <Crossword data={selectedFullPuzzle.data || selectedFullPuzzle} />
                </div>
                <button style={{marginTop: 12}} onClick={() => setSelectedFullPuzzle(null)}>
                  Close
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function DashboardWrapper() {
  return (
    <Routes>
      <Route path="/" element={<DashboardMain />} />
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
  // If the data is stored under a 'data' property, use it, else use the object itself
  const crosswordData = puzzle.data || puzzle;
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <h2>{puzzle.title || 'Pre-made Puzzle'}</h2>
      <Crossword data={crosswordData} />
    </div>
  );
}
