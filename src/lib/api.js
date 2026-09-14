/**
 * EvalScout Web API facade — Firebase backend.
 * Pages keep calling `api.*`; transport is Auth + Firestore + Storage.
 */
export { api, ApiError, subscribeAuth } from "./firebaseApi";
