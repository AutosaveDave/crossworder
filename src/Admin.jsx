import React, { useEffect, useState } from 'react';
import { getWordSets, addWordSet, updateWordSet, deleteWordSet, addWordToSet, updateWordInSet, deleteWordFromSet } from './firestore';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase';

export default function Admin() {
  const [wordSets, setWordSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newSetName, setNewSetName] = useState('');
  const [newSetWeight, setNewSetWeight] = useState(1);
  const [fullPuzzles, setFullPuzzles] = useState([]);
  const [loadingFullPuzzles, setLoadingFullPuzzles] = useState(false);
  const [toggleSwitch1, setToggleSwitch1] = useState(false);
  const [toggleSwitch2, setToggleSwitch2] = useState(false);
  const [deletingPuzzles, setDeletingPuzzles] = useState(false);
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
        const puzzles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setFullPuzzles(puzzles);
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
    <div style={{ maxHeight: '100vh', overflowY:'scroll'}}>
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
      <hr />      <div>
        <h3>Upload Full Crossword Puzzles (JSON)</h3>
        <input
          type="file"
          accept="application/json"
          multiple
          onChange={handleUploadPuzzles}
        />
      </div>      <hr />
      <div style={{ marginTop: '2em', border: '1px solid #f44336', padding: '1em', borderRadius: '4px', backgroundColor: '#fff8f8' }}>        <h3 style={{ color: '#d32f2f' }}>Danger Zone: Delete All Premade Puzzles</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ margin: '0.5em 0' }}>This will permanently delete <strong>all {fullPuzzles.length} premade puzzles</strong> from the database. This action cannot be undone.</p>
          <button 
            onClick={async () => {
              try {
                setLoadingFullPuzzles(true);
                const snapshot = await getDocs(collection(db, 'fullPuzzles'));
                const puzzles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setFullPuzzles(puzzles);
                setError('');
              } catch (error) {
                console.error('Error refreshing puzzle data:', error);
                setError('Failed to refresh puzzle data: ' + error.message);
              } finally {
                setLoadingFullPuzzles(false);
              }
            }}
            style={{ 
              padding: '0.3em 0.8em', 
              backgroundColor: '#4c7daf', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              fontSize: '0.9em'
            }}
            disabled={loadingFullPuzzles}
          >
            {loadingFullPuzzles ? 'Refreshing...' : 'Refresh Count'}
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1em' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginRight: '2em' }}>
            <input
              type="checkbox"
              checked={toggleSwitch1}
              onChange={() => setToggleSwitch1(!toggleSwitch1)}
              style={{ marginRight: '0.5em', width: '18px', height: '18px' }}
            />
            I understand this will delete all puzzles
          </label>
          
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={toggleSwitch2}
              onChange={() => setToggleSwitch2(!toggleSwitch2)}
              style={{ marginRight: '0.5em', width: '18px', height: '18px' }}
            />
            I confirm this is what I want to do
          </label>
        </div>
          <button 
          onClick={async () => {
            if (toggleSwitch1 && toggleSwitch2) {
              // First refresh the puzzle count to make sure we have the latest data
              try {
                setLoadingFullPuzzles(true);
                const snapshot = await getDocs(collection(db, 'fullPuzzles'));
                const puzzles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setFullPuzzles(puzzles);
                setLoadingFullPuzzles(false);
              } catch (error) {
                console.error('Error refreshing puzzle data:', error);
                setError('Failed to refresh puzzle data: ' + error.message);
                setLoadingFullPuzzles(false);
                return;
              }

              if (window.confirm(`WARNING: This will permanently delete ALL ${fullPuzzles.length} premade puzzles. Are you absolutely sure?`)) {
                try {
                  setDeletingPuzzles(true);
                  const snapshot = await getDocs(collection(db, 'fullPuzzles'));
                  for (const docSnapshot of snapshot.docs) {
                    await deleteDoc(doc(db, 'fullPuzzles', docSnapshot.id));
                  }
                  setFullPuzzles([]);
                  alert('All premade puzzles have been deleted successfully.');
                } catch (error) {
                  console.error('Error deleting puzzles:', error);
                  setError(`Failed to delete puzzles: ${error.message}`);
                } finally {
                  setDeletingPuzzles(false);
                  setToggleSwitch1(false);
                  setToggleSwitch2(false);
                }
              }
            } else {
              alert('You must check both confirmation boxes before deleting puzzles.');
            }
          }}          disabled={!toggleSwitch1 || !toggleSwitch2 || deletingPuzzles}
          style={{
            backgroundColor: toggleSwitch1 && toggleSwitch2 ? '#d32f2f' : '#aaa',
            color: 'white',
            padding: '0.5em 1em',
            border: 'none',
            borderRadius: '4px',
            cursor: toggleSwitch1 && toggleSwitch2 ? 'pointer' : 'not-allowed'
          }}
        >
          {deletingPuzzles ? 'Deleting...' : 'Delete All Premade Puzzles'}
        </button>
        {deletingPuzzles && <div style={{ marginTop: '1em', color: '#d32f2f' }}>Deleting all puzzles, please wait...</div>}
        
        {fullPuzzles.length > 0 && (
          <div style={{ marginTop: '1em', maxHeight: '200px', overflowY: 'auto', border: '1px solid #ddd', padding: '0.5em', borderRadius: '4px' }}>
            <h4 style={{ margin: '0 0 0.5em 0' }}>Current Puzzles ({fullPuzzles.length}):</h4>
            <ul style={{ margin: 0, paddingLeft: '1.5em' }}>
              {fullPuzzles.map(puzzle => (
                <li key={puzzle.id} style={{ fontSize: '0.9em', margin: '0.2em 0' }}>
                  {puzzle.title || 'Untitled'} {puzzle.date && `(${new Date(puzzle.date).toLocaleDateString()})`}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}