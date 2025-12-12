# Firebase Migration Guide

## Add `endTime` Field to Existing Events

### Quick Start

**Option 1: Run JavaScript Migration Script (Recommended)**

```bash
# From project root directory
node scripts/migrate-events.js
```

**Option 2: Run TypeScript Migration Script**

```bash
# Install ts-node if not already installed
npm install -g ts-node

# Run the script
ts-node scripts/migrate-events.ts
```

---

## What the Script Does

1. ✅ Connects to your Firebase project (event-handler-cc1ed)
2. ✅ Fetches all events from Firestore
3. ✅ Checks each event for existing `endTime` field
4. ✅ Skips events that already have `endTime`
5. ✅ Adds `endTime` = start time + 2 hours (default)
6. ✅ Logs progress and results

---

## Expected Output

```
==================================================
📦 Firebase Event Migration Script
==================================================

🚀 Starting Firebase migration...
📋 Fetching all events from Firestore...
📊 Found 5 events

✅ Updated "Tech Conference 2025"
   Start: 09:00 → End: 11:00
✅ Updated "Workshop: React Basics"
   Start: 14:00 → End: 16:00
⏭️  Skipping "Annual Meetup" - already has endTime: 18:00

==================================================
🎉 Migration completed!
==================================================
✅ Updated: 2 events
⏭️  Skipped: 1 events
📊 Total: 3 events
==================================================

✨ All done! Your events now have end times.
💡 Default: 2 hours after start time
📝 You can manually adjust end times in Firebase Console if needed.
```

---

## Manual Alternative (Firebase Console)

If you prefer to add `endTime` manually:

1. Go to [Firebase Console](https://console.firebase.google.com/project/event-handler-cc1ed/firestore)
2. Navigate to **Firestore Database** → **events** collection
3. For each event document:
   - Click **Edit**
   - Add field: `endTime` (type: string)
   - Value: `"HH:MM"` in 24-hour format (e.g., `"17:00"`)
   - Click **Update**

---

## Troubleshooting

### Error: "Cannot find module 'firebase'"

```bash
# Install Firebase SDK
npm install firebase
```

### Error: "Permission denied"

Check your Firebase rules in Console:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /events/{eventId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### Error: "No events found"

- Verify you're connected to the correct Firebase project
- Check if events collection exists in Firestore
- Ensure events have been created

---

## Customizing End Times

After migration, you can customize end times:

**Method 1: Firebase Console**
- Edit each event manually
- Adjust `endTime` field

**Method 2: Code Update**

Edit the script before running:

```javascript
// Default: 2 hours after start
const endHour = (parseInt(hour) + 2) % 24;

// Custom: 3 hours after start
const endHour = (parseInt(hour) + 3) % 24;

// Custom: Specific time (e.g., always end at 17:00)
const endTime = "17:00";
```

---

## Verification

After migration, verify in Firebase Console:

1. Open Firestore → events collection
2. Check random events
3. Confirm `endTime` field exists
4. Verify format is `"HH:MM"` (e.g., `"14:30"`)

---

## Next Steps

After successful migration:

1. ✅ Test event creation (should include endTime)
2. ✅ Test event display (shows end time)
3. ✅ Test status updates (upcoming → ongoing → completed)
4. ✅ Create new events with custom end times

---

## Rollback (if needed)

If you need to remove `endTime` fields:

```javascript
const { getDocs, updateDoc, doc, collection, deleteField } = require('firebase/firestore');

async function rollback() {
  const eventsSnapshot = await getDocs(collection(db, 'events'));
  
  for (const eventDoc of eventsSnapshot.docs) {
    await updateDoc(doc(db, 'events', eventDoc.id), {
      endTime: deleteField()
    });
  }
  
  console.log('Rollback complete');
}
```

---

## Support

If you encounter issues:
1. Check Node.js version: `node --version` (should be 16+)
2. Check npm packages: `npm list firebase`
3. Verify Firebase config in script matches your project
4. Check browser console for errors after migration

Migration script is safe to run multiple times - it will skip events that already have `endTime`! ✨
