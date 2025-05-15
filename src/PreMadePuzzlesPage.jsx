// src/PreMadePuzzlesPage.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import Crossword from '@jaredreisinger/react-crossword';
import dayjs from 'dayjs';

export default function PreMadePuzzlesPage() {
  const [fullPuzzles, setFullPuzzles] = useState([]);
  const [loadingFullPuzzles, setLoadingFullPuzzles] = useState(false);
  const navigate = useNavigate();

  // Search/filter state
  const [titleFilter, setTitleFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [decadeFilter, setDecadeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
   const [weekdayFilter, setWeekdayFilter] = useState('');

  useEffect(() => {
    async function fetchFullPuzzles() {
      setLoadingFullPuzzles(true);
      try {
        const snapshot = await getDocs(collection(db, 'fullPuzzles'));
        setFullPuzzles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch {
        // Optionally handle error
      }
      setLoadingFullPuzzles(false);
    }
    fetchFullPuzzles();
  }, []);

  function handleLoadFullPuzzle(puzzle) {
    sessionStorage.setItem('selectedFullPuzzle', JSON.stringify(puzzle));
    navigate(`/crossworder/fullpuzzle/${puzzle.id}`);
  }

  // Helper: get year/decade from puzzle
  function getPuzzleYear(p) {
    if (p.year) return Number(p.year);
    if (p.date) return dayjs(p.date).year();
    if (p.dateCreated) return dayjs(p.dateCreated).year();
    return undefined;
  }
  function getPuzzleDecade(p) {
    const y = getPuzzleYear(p);
    return y ? Math.floor(y / 10) * 10 : undefined;
  }

  // Handlers to ensure only one of year, decade, or date range is active at a time
  function handleYearChange(e) {
    setYearFilter(e.target.value);
    if (e.target.value) {
      setDecadeFilter('');
      setDateFrom('');
      setDateTo('');
    }
  }
  function handleDecadeChange(e) {
    setDecadeFilter(e.target.value);
    if (e.target.value) {
      setYearFilter('');
      setDateFrom('');
      setDateTo('');
    }
  }
  function handleDateFromChange(e) {
    setDateFrom(e.target.value);
    if (e.target.value) {
      setYearFilter('');
      setDecadeFilter('');
    }
  }
  function handleDateToChange(e) {
    setDateTo(e.target.value);
    if (e.target.value) {
      setYearFilter('');
      setDecadeFilter('');
    }
  }

  // Filtering logic
  const filteredPuzzles = fullPuzzles.filter(p => {
    // Title search
    if (titleFilter && !(p.title || '').toLowerCase().includes(titleFilter.toLowerCase())) return false;
    // Year filter
    if (yearFilter && getPuzzleYear(p) !== Number(yearFilter)) return false;
    // Decade filter
    if (decadeFilter && getPuzzleDecade(p) !== Number(decadeFilter)) return false;
    // Date range
    if (dateFrom && dayjs(p.dateCreated || p.date).isBefore(dayjs(dateFrom))) return false;
    if (dateTo && dayjs(p.dateCreated || p.date).isAfter(dayjs(dateTo))) return false;
    // Weekday filter
    if (weekdayFilter) {
      const date = dayjs(p.dateCreated || p.date);
      if (!date.isValid() || date.format('dddd') !== weekdayFilter) return false;
    }
    return true;
  });

  // Get unique years/decades for dropdowns
  const allYears = Array.from(new Set(fullPuzzles.map(getPuzzleYear).filter(Boolean))).sort((a,b) => b-a);
  const allDecades = Array.from(new Set(fullPuzzles.map(getPuzzleDecade).filter(Boolean))).sort((a,b) => b-a);

  return (
    <div className="dashboard-container fade-in" style={{flexDirection: 'column', alignItems: 'stretch', minHeight: '80vh'}}>
      <div className="dashboard-section" style={{marginBottom: 0, maxWidth: 1100, margin: '0 auto', width: '100%'}}>
        <h2 style={{fontSize: '2.2em', marginBottom: 0}}>Pre-made Crossword Puzzles</h2>
        <hr />
        {/* Filter/search controls */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end',
          marginBottom: 24, justifyContent: 'space-between',
        }}>
          <div style={{flex: '1 1 200px'}}>
            <label style={{fontWeight: 600}}>Title<br/>
              <input type="text" value={titleFilter} onChange={e => setTitleFilter(e.target.value)}
                placeholder="Search by title..." style={{width: '100%', fontSize: '1.1em', padding: 6, borderRadius: 6, border: '1px solid #ccc'}} />
            </label>
          </div>
          <div style={{flex: '1 1 120px'}}>
            <label style={{fontWeight: 600}}>Year<br/>
              <select value={yearFilter} onChange={handleYearChange} style={{width: '100%', fontSize: '1.1em', padding: 6, borderRadius: 6, border: '1px solid #ccc'}}>
                <option value="">All</option>
                {allYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </label>
          </div>
          <div style={{flex: '1 1 120px'}}>
            <label style={{fontWeight: 600}}>Decade<br/>
              <select value={decadeFilter} onChange={handleDecadeChange} style={{width: '100%', fontSize: '1.1em', padding: 6, borderRadius: 6, border: '1px solid #ccc'}}>
                <option value="">All</option>
                {allDecades.map(d => <option key={d} value={d}>{d}s</option>)}
              </select>
            </label>
          </div>
          <div style={{flex: '1 1 180px'}}>
            <label style={{fontWeight: 600}}>Date From<br/>
              <input type="date" value={dateFrom} onChange={handleDateFromChange} style={{width: '100%', fontSize: '1.1em', padding: 6, borderRadius: 6, border: '1px solid #ccc'}} />
            </label>
          </div>
          <div style={{flex: '1 1 180px'}}>
            <label style={{fontWeight: 600}}>Date To<br/>
              <input type="date" value={dateTo} onChange={handleDateToChange} style={{width: '100%', fontSize: '1.1em', padding: 6, borderRadius: 6, border: '1px solid #ccc'}} />
            </label>
          </div>
          <div style={{flex: '1 1 140px'}}>
            <label style={{fontWeight: 600}}>Weekday<br/>
              <select value={weekdayFilter} onChange={e => setWeekdayFilter(e.target.value)} style={{width: '100%', fontSize: '1.1em', padding: 6, borderRadius: 6, border: '1px solid #ccc'}}>
                <option value="">All</option>
                <option value="Monday">Monday</option>
                <option value="Tuesday">Tuesday</option>
                <option value="Wednesday">Wednesday</option>
                <option value="Thursday">Thursday</option>
                <option value="Friday">Friday</option>
                <option value="Saturday">Saturday</option>
                <option value="Sunday">Sunday</option>
              </select>
            </label>
          </div>
        </div>
        {/* Puzzle list */}
        <div style={{overflowX: 'auto'}}>
          {loadingFullPuzzles ? (
            <div>Loading full puzzles...</div>
          ) : (
            <>
              {filteredPuzzles.length === 0 && <div>No pre-made puzzles match your search.</div>}
              {filteredPuzzles.length > 0 && (
                <ul style={{paddingLeft: 0, listStyle: 'none', margin: 0}}>
                  {filteredPuzzles.map(p => (
                    <li key={p.id} style={{marginBottom: 12, display: 'flex', alignItems: 'center', flexWrap: 'wrap'}}>
                      <span style={{fontWeight: 600, fontSize: '1.1em', flex: '2 1 200px'}}>{p.title || p.id}</span>
                      {/* Remove year/decade display, but keep date if present */}
                      {p.dateCreated || p.date ? (
                        <span style={{marginLeft: 12, color: '#645e4f', fontSize: '0.95em', flex: '1 1 100px'}}>
                          {dayjs(p.dateCreated || p.date).format('MM-DD-YYYY')}
                        </span>
                      ) : null}
                      <button style={{marginLeft: 12, flex: '0 0 auto'}} onClick={() => handleLoadFullPuzzle(p)}>
                        Load
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
        <button style={{marginTop: 32}} onClick={() => navigate('/crossworder/')}>Back to Dashboard</button>
      </div>
    </div>
  );
}
