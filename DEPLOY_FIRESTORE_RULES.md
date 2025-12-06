# Deploy Firestore Rules to Firebase

## Important: You must deploy the firestore.rules to Firebase Console

The `firestore.rules` file in this project has been updated to allow public access to events. However, these rules are only stored locally and need to be manually deployed to Firebase.

## Steps to Deploy:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **event-handler-cc1ed**
3. Click on **Firestore Database** in the left sidebar
4. Click on the **Rules** tab at the top
5. Copy the content from `firestore.rules` file in this project
6. Paste it into the Firebase Console rules editor
7. Click **Publish** button

## Quick Copy - Paste these rules to Firebase Console:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow anyone to read events (public access for landing page)
    match /events/{eventId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Support messages - anyone can create, only admin can read
    match /supportMessages/{supportId} {
      allow create: if true;
      allow read, update, delete: if request.auth != null;
    }
    
    // All other collections require authentication
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## After Deployment:

- The landing page will show events without requiring login
- Users can submit support requests without authentication
- Admins can view all support messages
- Registration and other features remain protected
