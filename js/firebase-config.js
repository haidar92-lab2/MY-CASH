// عبي هالبيانات من مشروعك بـ Firebase Console:
// Project settings → General → Your apps → Web app → SDK setup and configuration
// هذا الملف آمن يكون عام (public)، الحماية الحقيقية تصير عبر Firestore Security Rules

export const firebaseConfig = {
  apiKey: "ضع_قيمتك_هنا",
  authDomain: "ضع_قيمتك_هنا.firebaseapp.com",
  projectId: "ضع_قيمتك_هنا",
  storageBucket: "ضع_قيمتك_هنا.appspot.com",
  messagingSenderId: "ضع_قيمتك_هنا",
  appId: "ضع_قيمتك_هنا"
};

// رقم الوكيل اللي يمتلك صلاحية الأدمن (توليد أكواد التفعيل)
// حط رقمك هنا بصيغة دولية بدون +، مثلاً "9647716321829"
export const ADMIN_PHONE = "9647716321829";

// رقم التواصل لطلب الاشتراك (يظهر بشاشة التفعيل)
export const SUPPORT_PHONE = "07716321829";
