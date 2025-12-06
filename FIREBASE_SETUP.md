# 🔥 Firebase Setup & Rules Configuration

## ⚠️ Current Issue: Registration Failed

The registration failure is most likely due to Firebase Firestore security rules. Here's how to fix it:

## 🛠️ Quick Fix (Development Mode)

**Step 1: Update Firestore Rules**
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `qr-code-1371a`
3. Navigate to **Firestore Database** → **Rules**
4. Replace the current rules with this **temporary development rule**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

5. Click **Publish**

**Step 2: Update Storage Rules**
1. Navigate to **Storage** → **Rules**
2. Replace with this rule:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. Click **Publish**

## 🔒 Production Rules (Use Later)

For production, use the rules in `firestore.rules` and `storage.rules` files in your project directory.

## 🧪 Test the Fix

1. Try registering for an event again
2. Check browser console (F12) for any error messages
3. Verify that you're logged in as an authenticated user

## 📋 Common Issues & Solutions

- **Permission Denied**: Update Firestore rules as above
- **Network Error**: Check internet connection and Firebase project status
- **Auth Error**: Make sure you're logged in before registering
- **Missing Fields**: Ensure all form fields are filled

The debug console logs will now show detailed information about the registration process to help identify any remaining issues.