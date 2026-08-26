// Phase 1 data layer: consume current Google Auth state from the isolated React provider.
import { useContext } from 'react'
import { AuthContext } from '../lib/auth-context'

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}
