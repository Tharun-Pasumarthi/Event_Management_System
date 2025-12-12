// Authenticated Firebase Migration Script
// This uses admin credentials to bypass security rules

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin SDK
// NOTE: You need a service account key for this
const admin = require('firebase-admin');

// If you have a service account key file, use this:
// const serviceAccount = require('./serviceAccountKey.json');
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// });

// For now, use environment variable
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'event-handler-cc1ed'
});

const db = getFirestore();

async function migrateEventsWithAuth() {
  try {
    console.log('🚀 Starting authenticated Firebase migration...');
    console.log('📋 Fetching all events from Firestore...');
    
    const eventsSnapshot = await db.collection('events').get();
    console.log(`📊 Found ${eventsSnapshot.size} events\n`);
    
    if (eventsSnapshot.size === 0) {
      console.log('⚠️  No events found in database');
      return;
    }
    
    let updated = 0;
    let skipped = 0;
    
    for (const eventDoc of eventsSnapshot.docs) {
      const data = eventDoc.data();
      
      if (data.endTime) {
        console.log(`⏭️  Skipping "${data.title}" - already has endTime: ${data.endTime}`);
        skipped++;
        continue;
      }
      
      if (!data.time) {
        console.log(`⚠️  Skipping "${data.title}" - no start time found`);
        skipped++;
        continue;
      }
      
      const [hour, minute] = data.time.split(':');
      let endHour = (parseInt(hour) + 2) % 24;
      const endTime = `${endHour.toString().padStart(2, '0')}:${minute}`;
      
      try {
        await eventDoc.ref.update({
          endTime: endTime
        });
        
        console.log(`✅ Updated "${data.title}"`);
        console.log(`   Start: ${data.time} → End: ${endTime}`);
        updated++;
      } catch (updateError) {
        console.error(`❌ Failed to update "${data.title}":`, updateError.message);
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 Migration completed!');
    console.log('='.repeat(50));
    console.log(`✅ Updated: ${updated} events`);
    console.log(`⏭️  Skipped: ${skipped} events`);
    console.log(`📊 Total: ${eventsSnapshot.size} events`);
    
  } catch (error) {
    console.error('\n💥 Migration failed:', error);
    throw error;
  }
}

console.log('\n' + '='.repeat(50));
console.log('📦 Authenticated Firebase Migration Script');
console.log('='.repeat(50) + '\n');

migrateEventsWithAuth()
  .then(() => {
    console.log('\n✨ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n⚠️  Migration failed');
    process.exit(1);
  });
