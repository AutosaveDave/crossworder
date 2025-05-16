import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from './useAuth';
import { Crossword, CrosswordProvider, CrosswordGrid, ThemeProvider } from '@jaredreisinger/react-crossword';
import { doc, getDoc, setDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { v4 as uuidv4 } from 'uuid';

const crosswordTheme = {
      gridBackground: '#222222',
      cellBackground: '#f6f6f6',
      cellBorder: '#121212',
      textColor: '#000000',
      numberColor: '#121212',
    }

function FullPuzzleView() {
  const { puzzleId } = useParams();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [puzzle, setPuzzle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progressDocId, setProgressDocId] = useState(null);
  const [saveCount, setSaveCount] = useState(0);
  const [gridState, setGridState] = useState([]); // Store current grid state
  
  // Create a ref for the Crossword component
  const crosswordRef = React.useRef(null);

  // Fetch the puzzle data
  useEffect(() => {    async function fetchPuzzle() {
      if (!puzzleId) return;
      setLoading(true);
      try {
        const puzzleDoc = await getDoc(doc(db, 'fullPuzzles', puzzleId));
        if (puzzleDoc.exists()) {
          setPuzzle(puzzleDoc.data());
        } else {
          console.error('Puzzle not found in database:', puzzleId);
        }
      } catch (error) {
        console.error('Error fetching puzzle:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchPuzzle();
  }, [puzzleId]);
  
  // Fetch existing progress document
  useEffect(() => {    async function fetchProgress() {
      if (!user || !puzzleId) return;
      
      try {
        const q = query(
          collection(db, 'premadeProgress'),
          where('userId', '==', user.uid),
          where('fullPuzzleId', '==', puzzleId)
        );
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const progressDoc = snapshot.docs[0];
          setProgressDocId(progressDoc.id);
          
          // Convert gridData back to format needed by crossword
          const gridData = progressDoc.data().gridData || [];
          setGridState(gridData);
          
          // We'll restore this data when the crossword is rendered
        }
      } catch (error) {
        console.error('Error fetching progress:', error);
      }
    }
    
    fetchProgress();
  }, [user, puzzleId]);
    // Additional effect to manually restore progress after component has fully mounted
  useEffect(() => {
    // Only run once the puzzle is loaded and we have grid state
    if (!loading && puzzle && gridState.length > 0) {
      // Wait a bit longer to ensure everything is ready
      const timer = setTimeout(() => {
        if (crosswordRef.current && crosswordRef.current.setGuess) {
          gridState.forEach(cell => {
            try {
              crosswordRef.current.setGuess(cell.row, cell.col, cell.letter);
            } catch (err) {
              console.error(`Error restoring cell:`, err);
            }
          });
        }
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [loading, puzzle, gridState]);
  // Function to save progress to Firestore
  const saveProgress = useCallback(async () => {
    if (!user || !puzzleId || !puzzle) {
      return;
    }
    
    try {
      setSaving(true);
      setSaveError(null);
      
      // Collect all filled cells from current crossword state
      const filledCells = gridState;
      
      // Determine if we need to update an existing doc or create a new one
      let docId = progressDocId;
      if (!docId) {
        docId = uuidv4();
        setProgressDocId(docId);
      }
      
      // Save to Firestore
      const saveTime = Timestamp.now();
      await setDoc(doc(db, 'premadeProgress', docId), {
        userId: user.uid,
        fullPuzzleId: puzzleId,
        gridData: filledCells,
        lastSaved: saveTime,
      });
      
      setLastSaved(saveTime.toDate());
      setSaveCount(prev => prev + 1);
      
    } catch (error) {
      console.error('Error saving progress:', error);
      setSaveError(error.message || 'Failed to save progress');
    } finally {
      setSaving(false);
    }
  }, [user, puzzleId, puzzle, gridState, progressDocId]);
    // Cell change handler - update our gridState
  const handleCellChange = (row, col, value) => {
    // Update our local state of the grid
    setGridState(prevState => {
      // Remove any existing entry for this cell
      const newState = prevState.filter(cell => !(cell.row === row && cell.col === col));
      
      // Add the new value if it's not empty
      if (value && value.trim() !== '') {
        newState.push({ row, col, letter: value });
      }
      
      return newState;
    });
    
    // Save after a short delay - use a ref to track the most recent timeout
    clearTimeout(window.savePuzzleTimeout);
    window.savePuzzleTimeout = setTimeout(() => {
      try {
        saveProgress();
      } catch (err) {
        console.error('Error in delayed save:', err);
      }
    }, 500);
  };
    // Restore saved progress when the crossword is ready
  const handleCrosswordReady = useCallback(() => {
    // Function to apply the saved letters to the grid
    const applyLettersToGrid = () => {
      if (gridState.length > 0 && crosswordRef.current && crosswordRef.current.setGuess) {
        // Apply each saved letter to the grid
        gridState.forEach(cell => {
          try {
            crosswordRef.current.setGuess(cell.row, cell.col, cell.letter);
          } catch (err) {
            console.error(`Error restoring cell:`, err);
          }
        });
      }
    };
    
    // Attempt initial restoration
    if (gridState.length > 0 && crosswordRef.current) {
      // Use a longer delay to ensure the crossword is fully rendered and initialized
      setTimeout(applyLettersToGrid, 500);
      
      // Add a second attempt with even longer delay as backup
      setTimeout(applyLettersToGrid, 1500);
    }
  }, [gridState]);
  
  if (loading) {
    return <div>Loading puzzle...</div>;
  }

  if (!puzzle) {
    return <div>Puzzle not found. Please return to the dashboard and select a puzzle.</div>;
  }

  const crosswordData = puzzle.data || puzzle;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>      <h2>{puzzle.title || 'Pre-made Puzzle'}</h2>
      <ThemeProvider theme={crosswordTheme}>
        <Crossword
            ref={crosswordRef}
            data={crosswordData}
            onCellChange={handleCellChange}            onCrosswordComplete={() => {}}
            onReady={handleCrosswordReady}        // Convert our gridState array to the format expected by react-crossword
            gridData={gridState.reduce((acc, cell) => {
            acc[`${cell.row}_${cell.col}`] = cell.letter;
            return acc;
            }, {})}
            // Setting useStorage to false ensures we fully control the grid state
            // and prevents conflicts with localStorage
            useStorage={false}
            // Disable this key to prevent auto-saving to localStorage
            // We'll manage our own state with Firestore
            storageKey={null}
        />
      </ThemeProvider>
      {saving && <div style={{
        fontSize: '0.9em', 
        color: '#fff',
        background: '#4c7daf', 
        padding: '8px 16px', 
        position: 'fixed', 
        bottom: '20px', 
        right: '20px',
        borderRadius: '4px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
      }}>Saving progress...</div>}
      
      <div style={{marginTop: 10, display: 'flex', gap: '10px'}}>
        <button 
          onClick={() => {
            saveProgress();
          }}
          style={{
            padding: '8px 15px', 
            backgroundColor: '#4c7daf', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px'
          }}
        >
          Save Progress Now
        </button>
        
        <button          onClick={() => {
            if (gridState.length > 0 && crosswordRef.current) {
              gridState.forEach(cell => {
                try {
                  if (crosswordRef.current && crosswordRef.current.setGuess) {
                    crosswordRef.current.setGuess(cell.row, cell.col, cell.letter);
                  }
                } catch (err) {
                  console.error(`Error restoring cell:`, err);
                }
              });
            }
          }}
          style={{
            padding: '8px 15px', 
            backgroundColor: '#3c5c73', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            fontWeight: 'bold',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}
        >
          Manually Restore Letters
        </button>
      </div>
    </div>
  );
}

export default FullPuzzleView;
