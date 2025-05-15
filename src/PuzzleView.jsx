// src/PuzzleView.jsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from './useAuth';
import { fetchUserPuzzles } from './firestore';
import Crossword from '@jaredreisinger/react-crossword';

export default function PuzzleView() {
  const { user } = useAuth();
  const { puzzleId } = useParams();
  const [puzzle, setPuzzle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPuzzle() {
      setLoading(true);
      const puzzles = await fetchUserPuzzles(user.uid);
      const found = puzzles.find(p => p.id === puzzleId);
      setPuzzle(found || null);
      setLoading(false);
    }
    if (user && puzzleId) loadPuzzle();
  }, [user, puzzleId]);

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
      <div className="crossword-board">
        <Crossword data={crosswordData} />
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
