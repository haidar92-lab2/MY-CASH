import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, collection,
  query, where, getDocs, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// ---------- تشفير الرمز السري (بسيط، من طرف المتصفح) ----------
export async function hashPin(pin) {
  const enc = new TextEncoder().encode(pin);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ---------- أكواد التفعيل ----------
export async function getActivationCode(code) {
  const ref = doc(db, 'activationCodes', code.trim().toUpperCase());
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function bindActivationCode(code, phone) {
  const ref = doc(db, 'activationCodes', code.trim().toUpperCase());
  await updateDoc(ref, {
    status: 'used',
    boundAgentPhone: phone,
    usedAt: serverTimestamp()
  });
}

export async function createActivationCode(code, plan) {
  const ref = doc(db, 'activationCodes', code.trim().toUpperCase());
  await setDoc(ref, {
    code: code.trim().toUpperCase(),
    plan,
    status: 'unused',
    boundAgentPhone: null,
    createdAt: serverTimestamp(),
    usedAt: null
  });
}

// ---------- الوكلاء ----------
export async function getAgent(phone) {
  const ref = doc(db, 'agents', phone);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createAgent(phone, pinHash, activationCode, plan, subscriptionEnd) {
  const ref = doc(db, 'agents', phone);
  await setDoc(ref, {
    phone,
    pinHash,
    activationCode,
    plan,
    subscriptionStart: serverTimestamp(),
    subscriptionEnd,
    isAdmin: false,
    createdAt: serverTimestamp()
  });
}

export async function updateAgentPin(phone, newPinHash) {
  const ref = doc(db, 'agents', phone);
  await updateDoc(ref, { pinHash: newPinHash });
}

// ---------- استرجاع الرمز عبر واتساب (OTP) ----------
export async function saveOtp(phone, otp) {
  const ref = doc(db, 'otpRequests', phone);
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 دقائق
  await setDoc(ref, { otp, expiresAt, createdAt: serverTimestamp() });
}

export async function verifyOtp(phone, otp) {
  const ref = doc(db, 'otpRequests', phone);
  const snap = await getDoc(ref);
  if (!snap.exists()) return false;
  const data = snap.data();
  if (Date.now() > data.expiresAt) return false;
  return data.otp === otp;
}
