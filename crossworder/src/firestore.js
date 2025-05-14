// src/firestore.js
import { db } from './firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  setDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';

// Fetch all word sets
export async function fetchWordSets() {
  const wordSetsCol = collection(db, 'wordSets');
  const snapshot = await getDocs(wordSetsCol);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Save a new puzzle for a user
export async function saveUserPuzzle(userId, puzzle) {
  const userDoc = doc(db, 'users', userId);
  await updateDoc(userDoc, {
    savedPuzzles: arrayUnion(puzzle)
  });
}

// Load all saved puzzles for a user
export async function fetchUserPuzzles(userId) {
  const userDoc = doc(db, 'users', userId);
  const snapshot = await getDoc(userDoc);
  return snapshot.exists() ? snapshot.data().savedPuzzles || [] : [];
}

// Update a specific puzzle for a user (by puzzleId)
export async function updateUserPuzzle(userId, puzzleId, updatedPuzzle) {
  const userDoc = doc(db, 'users', userId);
  const snapshot = await getDoc(userDoc);
  if (!snapshot.exists()) return;
  const puzzles = snapshot.data().savedPuzzles || [];
  const newPuzzles = puzzles.map(p => p.id === puzzleId ? updatedPuzzle : p);
  await updateDoc(userDoc, { savedPuzzles: newPuzzles });
}

// Add a new word set
export async function addWordSet(wordSet) {
  const wordSetsCol = collection(db, 'wordSets');
  const newDoc = doc(wordSetsCol);
  await setDoc(newDoc, { ...wordSet, words: [] });
}

// Update a word set
export async function updateWordSet(id, data) {
  const wordSetDoc = doc(db, 'wordSets', id);
  await updateDoc(wordSetDoc, data);
}

// Delete a word set
export async function deleteWordSet(id) {
  const wordSetDoc = doc(db, 'wordSets', id);
  await deleteDoc(wordSetDoc);
}

// Add a word to a set
export async function addWordToSet(setId, wordObj) {
  const wordSetDoc = doc(db, 'wordSets', setId);
  await updateDoc(wordSetDoc, { words: arrayUnion(wordObj) });
}

// Update a word in a set
export async function updateWordInSet(setId, oldWordObj, newWordObj) {
  const wordSetDoc = doc(db, 'wordSets', setId);
  await updateDoc(wordSetDoc, {
    words: arrayRemove(oldWordObj)
  });
  await updateDoc(wordSetDoc, {
    words: arrayUnion(newWordObj)
  });
}

// Delete a word from a set
export async function deleteWordFromSet(setId, wordObj) {
  const wordSetDoc = doc(db, 'wordSets', setId);
  await updateDoc(wordSetDoc, { words: arrayRemove(wordObj) });
}

// Alias for fetchWordSets for Admin.jsx
export const getWordSets = fetchWordSets;
