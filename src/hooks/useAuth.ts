import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { useApp } from '../context/AppContext';

export function useAuth() {
  const { setCurrentUser, setAuthReady } = useApp();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      setCurrentUser(user);
      setAuthReady(true);
    });
    return unsub;
  }, [setCurrentUser, setAuthReady]);
}
