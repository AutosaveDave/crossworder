// src/PreMadePuzzlesPage.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  query, 
  where, 
  Timestamp, 
  limit, 
  startAfter,
  endBefore,
  limitToLast,
  orderBy
} from 'firebase/firestore';
import { db } from './firebase';
import dayjs from 'dayjs';
import { useAuth } from './useAuth';

export default function PreMadePuzzlesPage() {
  const [fullPuzzles, setFullPuzzles] = useState([]);
  const [loadingFullPuzzles, setLoadingFullPuzzles] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Search/filter state
  const [titleFilter, setTitleFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [decadeFilter, setDecadeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [weekdayFilter, setWeekdayFilter] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25; // Fixed page size for all requests
  const [lastVisibleDoc, setLastVisibleDoc] = useState(null);
  const [firstVisibleDoc, setFirstVisibleDoc] = useState(null);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [hasPrevPage, setHasPrevPage] = useState(false);
  
  // Store page snapshots for fast pagination
  const [pageSnapshots, setPageSnapshots] = useState({});
  
  // Local data for UI filters that can't be done on server
  const [allYears, setAllYears] = useState([]);
  const [allDecades, setAllDecades] = useState([]);

  // Load initial data and filter options
  useEffect(() => {
    async function fetchFilterOptions() {
      try {
        // Get a sample of data to build filter options
        // This won't change often so we can get a larger set
        const sampleQuery = query(
          collection(db, 'fullPuzzles'),
          orderBy('title'),
          limit(100) // Get enough to build year/decade lists
        );
        
        const sampleSnapshot = await getDocs(sampleQuery);
        const sampleData = sampleSnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data()
        }));
        
        // Extract years and decades for filter dropdowns
        const years = new Set();
        const decades = new Set();
        
        sampleData.forEach(p => {
          const year = getPuzzleYear(p);
          if (year) {
            years.add(year);
            decades.add(Math.floor(year / 10) * 10);
          }
        });
        
        setAllYears(Array.from(years).sort((a, b) => b - a));
        setAllDecades(Array.from(decades).sort((a, b) => b - a));
      } catch (error) {
        console.error("Error fetching filter options:", error);
      }
    }
    
    fetchFilterOptions();
    // Initial data load using fetchPage instead of loadPuzzles
    fetchPage(1, 'reload');
  }, []);

  // Function to fetch a specific page
  const fetchPage = async (page, direction = 'next') => {
    setLoadingFullPuzzles(true);
    
    try {
      // Check if we already have this page cached
      if (pageSnapshots[page] && direction !== 'reload') {
        setFullPuzzles(pageSnapshots[page].puzzles);
        setFirstVisibleDoc(pageSnapshots[page].firstDoc);
        setLastVisibleDoc(pageSnapshots[page].lastDoc);
        setCurrentPage(page);
        setHasNextPage(pageSnapshots[page].hasNext);
        setHasPrevPage(page > 1);
        setLoadingFullPuzzles(false);
        return;
      }
      
      // Base query components
      let baseQueryRef = collection(db, 'fullPuzzles');
      let queryConstraints = [];
      
      // Always include sorting
      queryConstraints.push(orderBy('title'));
      
      // Add filters - server-side filters when possible
      if (titleFilter) {
        const titleUpperBound = titleFilter.replace(/.$/, 
          c => String.fromCharCode(c.charCodeAt(0) + 1));
        queryConstraints.push(where('title', '>=', titleFilter));
        queryConstraints.push(where('title', '<', titleUpperBound));
      }
      
      if (yearFilter) {
        queryConstraints.push(where('year', '==', Number(yearFilter)));
      }
      
      // Handle pagination direction - ALWAYS include a limit
      if (direction === 'next' && lastVisibleDoc && page > 1) {
        queryConstraints.push(startAfter(lastVisibleDoc));
        queryConstraints.push(limit(itemsPerPage));
      } else if (direction === 'prev' && firstVisibleDoc && page < currentPage) {
        queryConstraints.push(endBefore(firstVisibleDoc));
        queryConstraints.push(limitToLast(itemsPerPage));
      } else {
        // First page or reload
        queryConstraints.push(limit(itemsPerPage));
      }
      
      // Debugging - log the query constraints
      console.log("Query constraints:", queryConstraints.map(c => c.type || c));
      
      // Create and execute the query
      const q = query(baseQueryRef, ...queryConstraints);
      const snapshot = await getDocs(q);
      
      console.log(`Retrieved ${snapshot.docs.length} documents`);
      
      // Handle empty results
      if (snapshot.empty) {
        setHasNextPage(false);
        if (direction === 'reload' || direction === 'next') {
          setFullPuzzles([]);
        }
        setLoadingFullPuzzles(false);
        return;
      }
      
      // Process the results
      const newPuzzles = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Set the last and first documents for pagination
      const lastDoc = snapshot.docs[snapshot.docs.length - 1];
      const firstDoc = snapshot.docs[0];
      
      // Update pagination state
      setFirstVisibleDoc(firstDoc);
      setLastVisibleDoc(lastDoc);
      setHasNextPage(snapshot.docs.length === itemsPerPage);
      setHasPrevPage(page > 1);
      
      // Cache this page's data for faster navigation
      setPageSnapshots(prev => ({
        ...prev,
        [page]: {
          puzzles: newPuzzles,
          firstDoc,
          lastDoc,
          hasNext: snapshot.docs.length === itemsPerPage
        }
      }));
      
      // Update the current data
      setFullPuzzles(newPuzzles);
      setCurrentPage(page);
    } catch (error) {
      console.error("Error fetching puzzles:", error);
    } finally {
      setLoadingFullPuzzles(false);
    }
  };
  
  // Handle next page navigation - make sure we pass the correct parameters
  const handleNextPage = () => {
    if (!loadingFullPuzzles && hasNextPage) {
      // Ensure we're explicitly telling it to go to the next page with pagination
      fetchPage(currentPage + 1, 'next');
    }
  };
  
  // Handle previous page navigation
  const handlePrevPage = () => {
    if (!loadingFullPuzzles && hasPrevPage) {
      fetchPage(currentPage - 1, 'prev');
    }
  };
  
  // Apply filters - trigger when filters change
  useEffect(() => {
    // Clear cached pages when filters change
    setPageSnapshots({});
    // Reset pagination
    setCurrentPage(1);
    setHasPrevPage(false);
    // Fetch with new filters
    fetchPage(1, 'reload');
  }, [titleFilter, yearFilter, decadeFilter, dateFrom, dateTo, weekdayFilter]);
  
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

  // Apply client-side filters that couldn't be done on the server
  const filteredPuzzles = fullPuzzles.filter(p => {
    // Skip filters that were already applied server-side
    if (titleFilter || yearFilter) return true;
    
    // Decade filter (can't be done efficiently on server)
    if (decadeFilter && getPuzzleDecade(p) !== Number(decadeFilter)) return false;
    
    // Date range filters
    if (dateFrom && dayjs(p.dateCreated || p.date).isBefore(dayjs(dateFrom))) return false;
    if (dateTo && dayjs(p.dateCreated || p.date).isAfter(dayjs(dateTo))) return false;
    
    // Weekday filter
    if (weekdayFilter) {
      const date = dayjs(p.dateCreated || p.date);
      if (!date.isValid() || date.format('dddd') !== weekdayFilter) return false;
    }
    
    return true;
  });

  async function savePremadeProgress(puzzle) {
    if (!user) return;
    try {
      // Check if progress already exists for this user/puzzle
      const q = query(
        collection(db, 'premadeProgress'),
        where('userId', '==', user.uid),
        where('fullPuzzleId', '==', puzzle.id)
      );
      const snapshot = await getDocs(q);
      
      // If a document exists, use its ID; otherwise generate a new one
      let docId;
      if (!snapshot.empty) {
        // Use the existing document ID - this ensures we update instead of creating a new one
        docId = snapshot.docs[0].id;
      } else {
        // For new documents, create a deterministic ID based on user and puzzle
        // This prevents duplicate documents even with concurrent requests
        docId = `${user.uid}_${puzzle.id}`;
      }
      
      const gridData = [];
      await setDoc(doc(db, 'premadeProgress', docId), {
        userId: user.uid,
        fullPuzzleId: puzzle.id,
        gridData,
        lastSaved: Timestamp.now(),
      });
    } catch (error) {
      console.error("Error saving progress:", error);
    }
  }

  function handleLoadFullPuzzle(puzzle) {
    // Save progress (0% if first time)
    savePremadeProgress(puzzle);  // Removed the 0 parameter as it wasn't used
    sessionStorage.setItem('selectedFullPuzzle', JSON.stringify(puzzle));
    navigate(`/crossworder/fullpuzzle/${puzzle.id}`);
  }

  return (
    <div className="dashboard-container fade-in" style={{flexDirection: 'column', alignItems: 'stretch', maxHeight: '100%'}}>
      <div className="dashboard-section" style={{marginBottom: 0, maxWidth: 1100, margin: '0 auto', width: '90%'}}>
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
        <div style={{
          maxHeight: '50vh',
          overflowX: 'auto', 
          overflowY: 'auto',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          padding: '6px',
          marginBottom: '4px',
          boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          {/* Content area */}
          <div style={{flexGrow: 1, minHeight: '300px'}}>
            {loadingFullPuzzles && filteredPuzzles.length === 0 ? (
              <div>Loading puzzles...</div>
            ) : (
              <>
                {filteredPuzzles.length === 0 ? (
                  <div>No pre-made puzzles match your search.</div>
                ) : (
                  <ul style={{paddingLeft: 0, listStyle: 'none', margin: 0}}>
                    {filteredPuzzles.map(p => (
                      <li key={p.id} style={{marginBottom: 12, display: 'flex', alignItems: 'center', flexWrap: 'wrap'}}>
                        <span style={{fontWeight: 600, fontSize: '1.1em', flex: '2 1 200px'}}>{p.title || p.id}</span>
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
          
          
        </div>
        {/* Pagination controls - always visible */}
          <div style={{
            display: 'flex', 
            justifyContent: 'space-around',
            alignItems: 'center',
            marginTop: 6,
            paddingTop: 6,
            borderTop: '1px solid #eee'
          }}>
            <button 
              onClick={handlePrevPage} 
              disabled={!hasPrevPage || loadingFullPuzzles}
              style={{
                opacity: !hasPrevPage || loadingFullPuzzles ? 0.5 : 1,
                minWidth: '80px'
              }}
            >
              Previous
            </button>
            <div>
              <span style={{fontSize: '0.9em', color: '#666'}}>
                Page {currentPage} • {filteredPuzzles.length} puzzles
              </span>
            </div>
            <button 
              onClick={handleNextPage} 
              disabled={!hasNextPage || loadingFullPuzzles}
              style={{
                opacity: !hasNextPage || loadingFullPuzzles ? 0.5 : 1,
                minWidth: '80px'
              }}
            >
              Next
            </button>
          </div>
        <button style={{marginTop: 8}} onClick={() => navigate('/crossworder/')}>Back to Dashboard</button>
        {/* Loading indicator */}
            {loadingFullPuzzles && (
              <div style={{
                position: 'absolute',
                bottom: '32px',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'rgba(255,255,255,0.8)',
                padding: '10px 20px',
                borderRadius: '5px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                Loading...
              </div>
            )}
      </div>
    </div>
  );
}
