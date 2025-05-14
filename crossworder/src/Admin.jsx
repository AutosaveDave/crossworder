import React, { useEffect, useState } from 'react';
import { getWordSets, addWordSet, updateWordSet, deleteWordSet, addWordToSet, updateWordInSet, deleteWordFromSet } from './firestore';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export default function Admin() {
  const [wordSets, setWordSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newSetName, setNewSetName] = useState('');
  const [newSetWeight, setNewSetWeight] = useState(1);
  const [fullPuzzles, setFullPuzzles] = useState([]);
  const [loadingFullPuzzles, setLoadingFullPuzzles] = useState(false);

  useEffect(() => {
    async function fetchSets() {
      setLoading(true);
      try {
        const sets = await getWordSets();
        setWordSets(sets);
      } catch (e) {
        setError('Failed to load word sets');
      }
      setLoading(false);
    }
    fetchSets();

    // Fetch full puzzles
    async function fetchFullPuzzles() {
      setLoadingFullPuzzles(true);
      try {
        const snapshot = await getDocs(collection(db, 'fullPuzzles'));
        setFullPuzzles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e) {
        setError('Failed to load full puzzles');
      }
      setLoadingFullPuzzles(false);
    }
    fetchFullPuzzles();
  }, []);

  const handleAddSet = async () => {
    if (!newSetName) return;
    setLoading(true);
    try {
      await addWordSet({ name: newSetName, weighting: newSetWeight });
      setNewSetName('');
      setNewSetWeight(1);
      const sets = await getWordSets();
      setWordSets(sets);
    } catch (e) {
      setError('Failed to add word set');
    }
    setLoading(false);
  };

  // Handler to update a word set's name or weighting
  const handleUpdateSet = async (id, name, weighting) => {
    setLoading(true);
    try {
      await updateWordSet(id, { name, weighting });
      const sets = await getWordSets();
      setWordSets(sets);
    } catch (e) {
      setError('Failed to update word set');
    }
    setLoading(false);
  };

  // Handler to delete a word set
  const handleDeleteSet = async (id) => {
    if (!window.confirm('Delete this word set? This cannot be undone.')) return;
    setLoading(true);
    try {
      await deleteWordSet(id);
      const sets = await getWordSets();
      setWordSets(sets);
    } catch (e) {
      setError('Failed to delete word set');
    }
    setLoading(false);
  };

  // Handler to add a word to a set
  const handleAddWord = async (setId, word, clue) => {
    setLoading(true);
    try {
      await addWordToSet(setId, { word, clue });
      const sets = await getWordSets();
      setWordSets(sets);
    } catch (e) {
      setError('Failed to add word');
    }
    setLoading(false);
  };

  // Handler to update a word in a set
  const handleUpdateWord = async (setId, oldWordObj, newWord, newClue) => {
    setLoading(true);
    try {
      await updateWordInSet(setId, oldWordObj, { word: newWord, clue: newClue });
      const sets = await getWordSets();
      setWordSets(sets);
    } catch (e) {
      setError('Failed to update word');
    }
    setLoading(false);
  };

  // Handler to delete a word from a set
  const handleDeleteWord = async (setId, wordObj) => {
    if (!window.confirm('Delete this word?')) return;
    setLoading(true);
    try {
      await deleteWordFromSet(setId, wordObj);
      const sets = await getWordSets();
      setWordSets(sets);
    } catch (e) {
      setError('Failed to delete word');
    }
    setLoading(false);
  };

  // Handler to upload and add full puzzles from JSON files
  const handleUploadPuzzles = async (event) => {
    const files = Array.from(event.target.files);
    setLoading(true);
    try {
      for (const file of files) {
        const text = await file.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (err) {
          setError(`Invalid JSON in file: ${file.name}`);
          continue;
        }
        // Store as a new document in fullPuzzles
        const { getFirestore, collection, addDoc } = await import('firebase/firestore');
        const { db } = await import('./firebase');
        await addDoc(collection(db, 'fullPuzzles'), data);
      }
      setError('');
      alert('Puzzles uploaded successfully!');
    } catch (e) {
      setError('Failed to upload puzzles');
    }
    setLoading(false);
  };

  // Local state for editing
  const [editSetId, setEditSetId] = useState(null);
  const [editSetName, setEditSetName] = useState('');
  const [editSetWeight, setEditSetWeight] = useState(1);
  const [newWord, setNewWord] = useState('');
  const [newClue, setNewClue] = useState('');
  const [editWordIdx, setEditWordIdx] = useState(null);
  const [editWord, setEditWord] = useState('');
  const [editClue, setEditClue] = useState('');

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  // Show admin UI if user is admin
  return (
    <div>
      <h2>Admin: Manage Word Sets</h2>
      <div>
        <input
          type="text"
          placeholder="New set name"
          value={newSetName ?? ''}
          onChange={e => setNewSetName(e.target.value)}
        />
        <input
          type="number"
          min={1}
          max={100}
          value={newSetWeight ?? 1}
          onChange={e => setNewSetWeight(Number(e.target.value))}
        />
        <button onClick={handleAddSet}>Add Word Set</button>
      </div>
      <hr />
      {wordSets.map(set => (
        <div key={set.id} style={{ border: '1px solid #ccc', margin: '1em 0', padding: '1em' }}>
          {editSetId === set.id ? (
            <div>
              <input
                type="text"
                value={editSetName ?? ''}
                onChange={e => setEditSetName(e.target.value)}
              />
              <input
                type="number"
                min={1}
                max={100}
                value={editSetWeight ?? 1}
                onChange={e => setEditSetWeight(Number(e.target.value))}
              />
              <button onClick={() => { handleUpdateSet(set.id, editSetName, editSetWeight); setEditSetId(null); }}>Save</button>
              <button onClick={() => setEditSetId(null)}>Cancel</button>
            </div>
          ) : (
            <div>
              <b>{set.name}</b> (weight: {set.weighting})
              <button onClick={() => { setEditSetId(set.id); setEditSetName(set.name); setEditSetWeight(set.weighting); }}>Edit</button>
              <button onClick={() => handleDeleteSet(set.id)}>Delete</button>
            </div>
          )}
          <div style={{ marginTop: '1em' }}>
            <h4>Words/Clues</h4>
            <ul>
              {(set.words || []).map((w, idx) => (
                <li key={idx}>
                  {editWordIdx === `${set.id}-${idx}` ? (
                    <>
                      <input
                        type="text"
                        value={editWord ?? ''}
                        onChange={e => setEditWord(e.target.value)}
                        placeholder="Word"
                      />
                      <input
                        type="text"
                        value={editClue ?? ''}
                        onChange={e => setEditClue(e.target.value)}
                        placeholder="Clue"
                      />
                      <button onClick={() => { handleUpdateWord(set.id, w, editWord, editClue); setEditWordIdx(null); }}>Save</button>
                      <button onClick={() => setEditWordIdx(null)}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <b>{w.word}</b>: {w.clue}
                      <button onClick={() => { setEditWordIdx(`${set.id}-${idx}`); setEditWord(w.word); setEditClue(w.clue); }}>Edit</button>
                      <button onClick={() => handleDeleteWord(set.id, w)}>Delete</button>
                    </>
                  )}
                </li>
              ))}
            </ul>
            <div>
              <input
                type="text"
                placeholder="New word"
                value={newWord ?? ''}
                onChange={e => setNewWord(e.target.value)}
              />
              <input
                type="text"
                placeholder="New clue"
                value={newClue ?? ''}
                onChange={e => setNewClue(e.target.value)}
              />
              <button onClick={() => { handleAddWord(set.id, newWord, newClue); setNewWord(''); setNewClue(''); }}>Add Word</button>
            </div>
          </div>
        </div>
      ))}
      <hr />
      <div>
        <h3>Upload Full Crossword Puzzles (JSON)</h3>
        <input
          type="file"
          accept="application/json"
          multiple
          onChange={handleUploadPuzzles}
        />
      </div>
    </div>
  );
}