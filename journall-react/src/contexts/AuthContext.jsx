// Phase 1 data layer: development-only Google Auth state matching the legacy app; no Firestore writes occur here.
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
} from 'firebase/auth'
import { auth } from '../lib/firebase'
import { AuthContext } from '../lib/auth-context'

function makeGoogleProvider() {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  return provider
}

function isRedirectFallback(error) {
  const code = error?.code || ''
  return (
    code === 'auth/popup-blocked' ||
    code === 'auth/popup-closed-by-user' ||
    code === 'auth/cancelled-popup-request' ||
    /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent)
  )
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true

    setPersistence(auth, browserLocalPersistence).catch((persistenceError) => {
      if (active) setError(persistenceError)
    })

    getRedirectResult(auth).catch((redirectError) => {
      if (active) setError(redirectError)
    })

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      if (!active) return
      setUser(nextUser)
      setLoading(false)
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    setError(null)
    const provider = makeGoogleProvider()

    try {
      await signInWithPopup(auth, provider)
    } catch (signInError) {
      if (isRedirectFallback(signInError)) {
        await signInWithRedirect(auth, provider)
        return
      }
      setError(signInError)
      throw signInError
    }
  }, [])

  const value = useMemo(
    () => ({ user, loading, error, signInWithGoogle }),
    [error, loading, signInWithGoogle, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
