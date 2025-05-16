// src/PuzzleView.jsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from './useAuth';
import { fetchUserPuzzles } from './firestore';
import Crossword from '@jaredreisinger/react-crossword';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

// Helper function to calculate total answer cells
function calculateTotalAnswerCells(layoutEntries) {
  
  const cellSet = new Set();
  if (!layoutEntries) return 0;
  layoutEntries.forEach(entry => {
    for (let i = 0; i < entry.answer.length; i++) {
      let r = entry.row;
      let c = entry.col;
      if (entry.direction === 'across') {
        c += i;
      } else { // 'down'
        r += i;
      }
      cellSet.add(`${r}_${c}`);
    }
  });
  return cellSet.size;
}

export default function PuzzleView() {
  console.log('PuzzleView rendering');
  const { user } = useAuth();
  const { puzzleId } = useParams();
  const [puzzle, setPuzzle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastSaveTime, setLastSaveTime] = useState(null);
  useEffect(() => {
    async function loadPuzzle() {
      console.log('Loading puzzle', puzzleId, 'for user', user.uid);
      setLoading(true);
      const puzzles = await fetchUserPuzzles(user.uid);
      const found = puzzles.find(p => p.id === puzzleId);
      setPuzzle(found || null);
      
      // Check if we have saved progress for this puzzle
      if (found && user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        console.log('User doc from Firestore:', userDocSnap.exists() ? 'exists' : 'does not exist');
        
        if (userDocSnap.exists() && userDocSnap.data().premadeProgress) {
          const savedProgress = userDocSnap.data().premadeProgress.find(p => p.puzzleId === puzzleId);
          console.log('Saved progress found?', !!savedProgress);
          
          if (savedProgress && savedProgress.gridData) {
            console.log('Loading saved grid data with', Object.keys(savedProgress.gridData).length, 'cells');
            // We'll use this gridData when initializing the crossword
            found.savedGridData = savedProgress.gridData;
          }
        }
      }
      
      setLoading(false);
    }
    if (user && puzzleId) loadPuzzle();
  }, [user, puzzleId]);
  
  // Add a manual save button to help debug
  const manualSave = () => {
    if (puzzle && puzzle.savedGridData) {
      console.log('%c MANUAL SAVE TRIGGERED', 'background: #ff5722; color: white; font-weight: bold;');
      savePremadeProgress(puzzle, puzzle.savedGridData);
    } else {
      console.error('Cannot manually save - no puzzle or grid data available');
    }
  };// Save progress for pre-made puzzles with simplified data structure
  async function savePremadeProgress(puzzle, currentGridData) {
    if (!user || !puzzle) return;

    setLastSaveTime(new Date().toISOString());

    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      let progress = [];
      if (userDocSnap.exists() && userDocSnap.data().premadeProgress) {
        progress = userDocSnap.data().premadeProgress.filter(p => p.puzzleId !== puzzle.id);
      }

      // Calculate percent complete
      const actualTotalCells = calculateTotalAnswerCells(puzzle.layout.entries);
      const filledCells = Array.isArray(currentGridData) ? currentGridData.length : 0;
      const percentComplete = actualTotalCells === 0 ? 0 : Math.round((filledCells / actualTotalCells) * 100);

      // Create the simplified progress entry
      const progressEntry = {
        puzzleId: puzzle.id,
        title: puzzle.title || 'Untitled Puzzle',
        percentComplete,
        lastAccessed: new Date().toISOString(),
        gridData: Array.isArray(currentGridData) ? currentGridData : [],
      };

      progress.push(progressEntry);

      // Use setDoc with merge: true to avoid issues with Firestore rules
      await setDoc(userDocRef, { premadeProgress: progress }, { merge: true });
    } catch (error) {
      console.error('Error saving progress to Firestore:', error);
    }
  }  
  // Handler for crossword changes - triggered by onCellChange prop
  function handleCrosswordChange(row, col, value) {
    if (!puzzle || !user) return;

    // Always keep gridData as an array of {letter, row, col}
    let updatedGridData = Array.isArray(puzzle.savedGridData) ? [...puzzle.savedGridData] : [];

    // Remove any existing entry for this cell
    updatedGridData = updatedGridData.filter(cell => !(cell.row === row && cell.col === col));

    // Only add if value is non-empty
    if (value && String(value).trim() !== '') {
      updatedGridData.push({ letter: value, row, col });
    }

    // Update the puzzle's saved grid data for future renders
    puzzle.savedGridData = updatedGridData;

    // Save to Firestore with the correct format
    savePremadeProgress(puzzle, updatedGridData);
  }

  // Add a method to convert the simplified gridData back to the format expected by the Crossword component
  useEffect(() => {
    if (puzzle && Array.isArray(puzzle.savedGridData)) {
      const formattedGridData = {};
      puzzle.savedGridData.forEach(cell => {
        if (cell.row !== undefined && cell.col !== undefined && cell.letter) {
          formattedGridData[`${cell.row}_${cell.col}`] = cell.letter;
        }
      });
      puzzle.savedGridData = formattedGridData;
    }
  }, [puzzle]);

  if (loading) return <div>Loading puzzle...</div>;
  if (!puzzle) return <div>Puzzle not found.</div>;

  // Convert layout.entries to the format expected by react-crossword
  const crosswordData = { across: {}, down: {} };
  puzzle.layout.entries.forEach(entry => {
    const dir = entry.direction === 'across' ? 'across' : 'down';
    crosswordData[dir][entry.number] = {
      answer: entry.answer,
      clue: entry.clue,
      row: entry.row,
      col: entry.col,
    };
  });

  // Only show puzzle and clues, nothing else
  // Responsive, newspaper-style layout: puzzle and clues side by side on iPad, stacked on mobile
  return (
    <div className="crossword-area fade-in">
      <div style={{ border: '1px solid #ddd', padding: '10px', marginBottom: '10px' }}>
        <div>Puzzle ID: {puzzle?.id}</div>
        <div>User ID: {user?.uid}</div>
        <div>Grid cells: {puzzle?.savedGridData ? Object.keys(puzzle.savedGridData).length : 0}</div>
        {lastSaveTime && (
          <div style={{ fontWeight: 'bold', color: 'green' }}>
            Last saved: {new Date(lastSaveTime).toLocaleTimeString()}
          </div>
        )}
        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          <button 
            onClick={manualSave}
            style={{ 
              padding: '8px 12px', 
              fontSize: '1em', 
              background: '#4285f4', 
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Save Progress
          </button>
          <button 
            onClick={() => alert('User: ' + (user?.uid || 'none') + ', Puzzle: ' + (puzzle?.id || 'none'))}
            style={{ 
              padding: '8px 12px', 
              fontSize: '1em', 
              background: '#ea4335', 
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Check Data
          </button>
        </div>
      </div><div className="crossword-board" style={{ margin: '0 auto' }}>
        <button 
          onClick={() => alert('Testing if alerts work')}
          style={{ marginBottom: '10px', padding: '10px', background: 'red', color: 'white', border: 'none' }}
        >
          Test Alert
        </button>
        <Crossword 
          data={crosswordData} 
          onCellChange={handleCrosswordChange}
          gridData={puzzle.savedGridData}
          useStorage={false}
        />
      </div>
      <div className="clues-area">
        <h3>Across</h3>
        <ul className="clues-list">
          {Object.entries(crosswordData.across).map(([num, clue]) => (
            <li key={num}><strong>{num}.</strong> {clue.clue}</li>
          ))}
        </ul>
        <h3>Down</h3>
        <ul className="clues-list">
          {Object.entries(crosswordData.down).map(([num, clue]) => (
            <li key={num}><strong>{num}.</strong> {clue.clue}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
