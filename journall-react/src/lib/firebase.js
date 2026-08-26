// Phase 1 data layer: reuse the legacy Firebase web configuration; this module performs no data writes.
import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { firebaseConfig } from '../../../firebase-config.js'

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
