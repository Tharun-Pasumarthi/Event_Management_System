// Run this script from your terminal to add endTime to existing events
// Usage: node scripts/migrate-events.js

const { initializeApp } = require('firebase/app');
const { getFirestore, getDocs, updateDoc, doc, collection } = require('firebase/firestore');

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC0bNecBonwYHlOUbBf50KLytl62nTKKkU",
  authDomain: "event-handler-cc1ed.firebaseapp.com",
  projectId: "event-handler-cc1ed",
  storageBucket: "event-handler-cc1ed.firebasestorage.app",
  messagingSenderId: "780326994646",
  appId: "1:780326994646:web:ed29d7d2eac9bd03fdc0ba"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateEvents() {
  try {
    console.log('🚀 Starting Firebase migration...');
    console.log('📋 Fetching all events from Firestore...');
    
    const eventsSnapshot = await getDocs(collection(db, 'events'));
    console.log(`📊 Found ${eventsSnapshot.size} events\n`);
    
    if (eventsSnapshot.size === 0) {
      console.log('⚠️  No events found in database');
      return;
    }
    
    let updated = 0;
    let skipped = 0;
    
    for (const eventDoc of eventsSnapshot.docs) {
      const data = eventDoc.data();
      
      // Skip if endTime already exists
      if (data.endTime) {
        console.log(`⏭️  Skipping "${data.title}" - already has endTime: ${data.endTime}`);
        skipped++;
        continue;
      }
      
      // Calculate default end time (2 hours after start)
      if (!data.time) {
        console.log(`⚠️  Skipping "${data.title}" - no start time found`);
        skipped++;
        continue;
      }
      
      const [hour, minute] = data.time.split(':');
      let endHour = (parseInt(hour) + 2) % 24;
      const endTime = `${endHour.toString().padStart(2, '0')}:${minute}`;
      
      try {
        // Update the document
        await updateDoc(doc(db, 'events', eventDoc.id), {
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
    console.log('='.repeat(50));
    console.log('\n✨ All done! Your events now have end times.');
    console.log('💡 Default: 2 hours after start time');
    console.log('📝 You can manually adjust end times in Firebase Console if needed.\n');
    
  } catch (error) {
    console.error('\n💥 Migration failed:', error);
    console.error('Error details:', error.message);
    throw error;
  }
}

// Run the migration
console.log('\n' + '='.repeat(50));
console.log('📦 Firebase Event Migration Script');
console.log('='.repeat(50) + '\n');

migrateEvents()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n⚠️  Migration stopped due to error');
    process.exit(1);
  });
