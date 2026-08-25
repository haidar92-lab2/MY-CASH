import { SUPPORT_PHONE } from './firebase-config.js';
import {
  getActivationCode, bindActivationCode, getAgent, createAgent,
  hashPin, updateAgentPin, saveOtp, verifyOtp
} from './db.js';

const PLAN_LABELS = { '1m': 'شهر واحد', '3m': '3 أشهر', '12m': 'سنة كاملة' };
const PLAN_DAYS = { '1m': 30, '3m': 90, '12m': 365 };

function show(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
}

function setError(elId, msg) {
  const el = document.getElementById(elId);
  el.textContent = msg;
  el.classList.toggle('show', !!msg);
}

document.getElementById('support-phone-display').textContent = SUPPORT_PHONE;

// ---------------- حالة البدء ----------------
window.addEventListener('DOMContentLoaded', () => {
  const savedPhone = localStorage.getItem('agentPhone');
  const isActivated = localStorage.getItem('deviceActivated') === 'true';
  if (!isActivated) {
    show('screen-activation');
  } else if (savedPhone) {
    show('screen-login');
    document.getElementById('login-phone').value = savedPhone;
  } else {
    show('screen-login');
  }
});

// ---------------- شاشة التفعيل ----------------
document.getElementById('btn-check-activation').addEventListener('click', async () => {
  const code = document.getElementById('activation-code').value.trim();
  setError('activation-error', '');
  if (!code) { setError('activation-error', 'أدخل كود التفعيل'); return; }

  const btn = document.getElementById('btn-check-activation');
  btn.disabled = true; btn.textContent = 'جاري التحقق...';

  try {
    const record = await getActivationCode(code);
    if (!record) { setError('activation-error', 'كود التفعيل غير صحيح'); return; }
    if (record.status === 'used') { setError('activation-error', 'هذا الكود مستخدم من قبل'); return; }

    localStorage.setItem('deviceActivated', 'true');
    localStorage.setItem('activationCode', record.code);
    localStorage.setItem('activationPlan', record.plan);
    show('screen-signup');
  } catch (e) {
    setError('activation-error', 'فشل الاتصال، تأكد من الانترنت وحاول مرة ثانية');
  } finally {
    btn.disabled = false; btn.textContent = 'تحقق من الكود';
  }
});

// ---------------- شاشة التسجيل الأول (بعد التفعيل) ----------------
document.getElementById('btn-signup').addEventListener('click', async () => {
  const phone = document.getElementById('signup-phone').value.trim();
  const pin = document.getElementById('signup-pin').value.trim();
  const pin2 = document.getElementById('signup-pin2').value.trim();
  setError('signup-error', '');

  if (!/^07[0-9]{9}$/.test(phone)) { setError('signup-error', 'أدخل رقم هاتف عراقي صحيح (07xxxxxxxxx)'); return; }
  if (!/^[0-9]{5}$/.test(pin)) { setError('signup-error', 'الرمز السري لازم يكون 5 أرقام'); return; }
  if (pin !== pin2) { setError('signup-error', 'الرمزين غير متطابقين'); return; }

  const btn = document.getElementById('btn-signup');
  btn.disabled = true; btn.textContent = 'جاري الإنشاء...';

  try {
    const existing = await getAgent(phone);
    if (existing) { setError('signup-error', 'هذا الرقم مسجل مسبقاً، سجل دخول بدل هذا'); return; }

    const code = localStorage.getItem('activationCode');
    const plan = localStorage.getItem('activationPlan');
    const days = PLAN_DAYS[plan] || 30;
    const subscriptionEnd = Date.now() + days * 24 * 60 * 60 * 1000;

    const pinHash = await hashPin(pin);
    await createAgent(phone, pinHash, code, plan, subscriptionEnd);
    await bindActivationCode(code, phone);

    localStorage.setItem('agentPhone', phone);
    document.getElementById('dashboard-plan').textContent = PLAN_LABELS[plan] || plan;
    show('screen-dashboard');
  } catch (e) {
    setError('signup-error', 'صار خطأ، حاول مرة ثانية');
  } finally {
    btn.disabled = false; btn.textContent = 'إنشاء الحساب';
  }
});

// ---------------- شاشة تسجيل الدخول ----------------
document.getElementById('btn-login').addEventListener('click', async () => {
  const phone = document.getElementById('login-phone').value.trim();
  const pin = document.getElementById('login-pin').value.trim();
  setError('login-error', '');

  if (!/^07[0-9]{9}$/.test(phone)) { setError('login-error', 'أدخل رقم هاتف صحيح'); return; }
  if (!/^[0-9]{5}$/.test(pin)) { setError('login-error', 'أدخل الرمز السري كامل (5 أرقام)'); return; }

  const btn = document.getElementById('btn-login');
  btn.disabled = true; btn.textContent = 'جاري الدخول...';

  try {
    const agent = await getAgent(phone);
    if (!agent) { setError('login-error', 'ما فيه حساب بهذا الرقم'); return; }

    const pinHash = await hashPin(pin);
    if (pinHash !== agent.pinHash) { setError('login-error', 'الرمز السري غير صحيح'); return; }

    if (agent.subscriptionEnd && Date.now() > agent.subscriptionEnd) {
      setError('login-error', 'انتهى اشتراكك، تواصل لتجديد الاشتراك');
      return;
    }

    localStorage.setItem('agentPhone', phone);
    document.getElementById('dashboard-plan').textContent = PLAN_LABELS[agent.plan] || agent.plan;
    show('screen-dashboard');
  } catch (e) {
    setError('login-error', 'فشل الاتصال، حاول مرة ثانية');
  } finally {
    btn.disabled = false; btn.textContent = 'دخول';
  }
});

document.getElementById('link-forgot-pin').addEventListener('click', () => {
  document.getElementById('forgot-phone').value = document.getElementById('login-phone').value;
  show('screen-forgot-1');
});

document.getElementById('link-to-login').addEventListener('click', () => show('screen-login'));

// ---------------- نسيت الرمز السري: خطوة 1 - إرسال OTP ----------------
document.getElementById('btn-send-otp').addEventListener('click', async () => {
  const phone = document.getElementById('forgot-phone').value.trim();
  setError('forgot1-error', '');
  if (!/^07[0-9]{9}$/.test(phone)) { setError('forgot1-error', 'أدخل رقم هاتف صحيح'); return; }

  const btn = document.getElementById('btn-send-otp');
  btn.disabled = true; btn.textContent = 'جاري الإرسال...';

  try {
    const agent = await getAgent(phone);
    if (!agent) { setError('forgot1-error', 'ما فيه حساب بهذا الرقم'); return; }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    await saveOtp(phone, otp);

    // TODO: هذا مكان استدعاء WhatsApp Business API الحقيقي لإرسال otp لرقم الوكيل
    // بالوقت الحالي (وضع تجريبي) نعرض الكود على الشاشة لغرض الاختبار فقط
    document.getElementById('otp-dev-hint').textContent = 'وضع تجريبي، الكود: ' + otp;

    localStorage.setItem('resetPhone', phone);
    show('screen-forgot-2');
  } catch (e) {
    setError('forgot1-error', 'فشل الإرسال، حاول مرة ثانية');
  } finally {
    btn.disabled = false; btn.textContent = 'إرسال الرمز عبر واتساب';
  }
});

// ---------------- نسيت الرمز السري: خطوة 2 - تأكيد OTP وتعيين رمز جديد ----------------
document.getElementById('btn-reset-pin').addEventListener('click', async () => {
  const phone = localStorage.getItem('resetPhone');
  const otp = document.getElementById('otp-code').value.trim();
  const newPin = document.getElementById('new-pin').value.trim();
  const newPin2 = document
