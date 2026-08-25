// عبي هالبيانات من مشروعك بـ Firebase Console:
// Project settings → General → Your apps → Web app → SDK setup and configuration
// هذا الملف آمن يكون عام (public)، الحماية الحقيقية تصير عبر Firestore Security Rules

export const firebaseConfig = {
  apiKey: "AIzaSyCFvmZnIPGJ4el-UbhjJFt9egWNYz0eNc0",
  authDomain: "my-cash-a.firebaseapp.com",
  projectId: "my-cash-a",
  storageBucket: "my-cash-a.firebasestorage.app",
  messagingSenderId: "57138169956",
  appId: "1:57138169956:web:c72af19c98226752353771"
};

// رقم الوكيل اللي يمتلك صلاحية الأدمن (توليد أكواد التفعيل)
// حط رقمك هنا بصيغة دولية بدون +، مثلاً "9647716321829"
export const ADMIN_PHONE = "9647716321829";

// رقم التواصل لطلب الاشتراك (يظهر بشاشة التفعيل)
export const SUPPORT_PHONE = "07716321829";
