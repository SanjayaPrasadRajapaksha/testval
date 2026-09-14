import { initializeApp } from "firebase/app";

import {
  initializeAppCheck,
  ReCaptchaV3Provider,
} from "firebase/app-check";

import {
  getAnalytics,
  isSupported as analyticsSupported,
} from "firebase/analytics";

import { getAuth } from "firebase/auth";

import {
  getFirestore,
  enableIndexedDbPersistence,
} from "firebase/firestore";

import { getStorage } from "firebase/storage";


// ======================================================
// Firebase Configuration
// ======================================================

const firebaseConfig = {
  apiKey: "AIzaSyCuFt8kGzq49L4rhSsSgkZUx48aPYIEtcU",
  authDomain: "evalscout-cb68e.firebaseapp.com",
  projectId: "evalscout-cb68e",
  storageBucket: "evalscout-cb68e.firebasestorage.app",
  messagingSenderId: "1085598115274",
  appId: "1:1085598115274:web:72b40a9d54409342839b33",
  measurementId: "G-LBT6HCJ9G2",
};


// ======================================================
// App Check Configuration
// ======================================================

const RECAPTCHA_SITE_KEY =
  import.meta.env.VITE_RECAPTCHA_SITE_KEY ||
  "6LdxCpQtAAAAAGR5pNmveYK_G-PBDRjGTmLTPWF2";


// ======================================================
// IMPORTANT:
// Enable App Check debug mode BEFORE initializeAppCheck()
// ======================================================

if (import.meta.env.DEV) {
  globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}


// ======================================================
// Initialize Firebase
// ======================================================

export const firebaseApp = initializeApp(firebaseConfig);


// ======================================================
// Initialize Firebase App Check
// ======================================================

export const appCheck = initializeAppCheck(firebaseApp, {
  provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),
  isTokenAutoRefreshEnabled: true,
});


// ======================================================
// Firebase Authentication
// ======================================================

export const auth = getAuth(firebaseApp);


// ======================================================
// Firestore
// ======================================================

export const db = getFirestore(firebaseApp);


// ======================================================
// Firebase Storage
// ======================================================

export const storage = getStorage(firebaseApp);


// ======================================================
// Firebase Analytics
// ======================================================

let analyticsPromise = null;

export function initAnalytics() {
  if (!analyticsPromise) {
    analyticsPromise = analyticsSupported().then((supported) => {
      if (supported) {
        return getAnalytics(firebaseApp);
      }

      return null;
    });
  }

  return analyticsPromise;
}


// ======================================================
// Firestore Offline Persistence
// ======================================================

enableIndexedDbPersistence(db).catch((error) => {
  // Ignore persistence errors such as multi-tab conflicts.
  console.debug(
    "Firestore persistence:",
    error?.message || error
  );
});