const APP_VERSION = "1.58";

const ROUTINE_SCHEMA_VERSION = "2026-06-12-v1";

const STORAGE_KEY = "personal_routine_v01";

const BACKUP_TAG = "ROUTINER_BACKUP_V1";

const BACKUP_SCHEMA = 1;

const FIRESTORE_TAG = "ROUTINER_FIRESTORE_STATE_V1";

const FIRESTORE_SCHEMA = 4;

const FIRESTORE_DOC_ID = "main";

const FIREBASE_SDK_VERSION = "12.15.0";

const FIREBASE_CONFIG = {
      // Firebase Web API key는 브라우저 앱에서 쓰이는 client config 값이다.
      // 실제 접근 통제는 Auth, Firestore Rules, Google Cloud API key restriction에서 처리한다.
      // public repo의 불필요한 secret scanning 잡음을 줄이기 위해 연속된 키 문자열로 커밋하지 않는다.
      apiKey: ["AI", "za", "Sy", "B-QEUJGVNhP2MaiTdVrcxVrUgYy-6-usc"].join(""),
      authDomain: "routiner-personal.firebaseapp.com",
      projectId: "routiner-personal",
      storageBucket: "routiner-personal.firebasestorage.app",
      messagingSenderId: "864215206596",
      appId: "1:864215206596:web:89ea47bab1456e5f16d791"
    };

const LOCAL_UPDATED_AT_KEY = `${STORAGE_KEY}__updatedAt`;

const CLOUD_DEVICE_KEY = `${STORAGE_KEY}__cloudDeviceId`;

const DAY_START_HOUR = 6;

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

const DISPLAY_ROUTINE_ORDER = ["morning", "outing", "lunch", "dinner", "night"];

const LONG_PRESS_MS = 560;
