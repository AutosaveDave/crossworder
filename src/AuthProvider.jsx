// src/AuthProvider.jsx
import React, { createContext, useEffect, useState } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, updatePassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

const AuthContext = createContext();

export { AuthContext };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        let userData = userDoc.exists() ? userDoc.data() : {};
        console.log('firebaseUser:');
        console.log(firebaseUser);
        console.log(userDoc)
        const isAdmin = userData.admin;
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          admin: isAdmin,
          ...userData,
        });
        console.log(`isAdmin: ${isAdmin}`);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = (email, password) => {
    if (email === 'google') {
      const provider = new GoogleAuthProvider();
      return signInWithPopup(auth, provider);
    }
    return signInWithEmailAndPassword(auth, email, password);
  };
  const logout = () => signOut(auth);
  const changePassword = (newPassword) => updatePassword(auth.currentUser, newPassword);

  const value = { user, login, logout, changePassword };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
