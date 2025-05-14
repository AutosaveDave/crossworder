// src/PuzzleView.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { fetchUserPuzzles, updateUserPuzzle } from './firestore';
import Crossword from '@jaredreisinger/react-crossword';

export default function PuzzleView() {
  const { user } = useAuth();
  const { puzzleId } = useParams();
  const navigate = useNavigate();
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
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <h2>Puzzle: {puzzle.size}x{puzzle.size}</h2>
      <Crossword data={crosswordData} />
    </div>
  );
}
