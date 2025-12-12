// Firebase Migration Script
// Run this once to add endTime field to existing events

import { getDocs, updateDoc, doc, collection } from 'firebase/firestore';
import { db } from './src/lib/firebase';

async function migrateEvents() {
  try {
    console.log('🚀 Starting Firebase migration...');
    console.log('📋 Fetching all events...');
    
    const eventsSnapshot = await getDocs(collection(db, 'events'));
    console.log(`📊 Found ${eventsSnapshot.size} events`);
    
    let updated = 0;
    let skipped = 0;
    
    for (const eventDoc of eventsSnapshot.docs) {
      const data = eventDoc.data();
      
      // Skip if endTime already exists
      if (data.endTime) {
        console.log(`⏭️  Skipping "${data.title}" - already has endTime`);
        skipped++;
        continue;
      }
      
      // Calculate default end time (2 hours after start)
      const [hour, minute] = data.time.split(':');
      const endHour = (parseInt(hour) + 2) % 24;
      const endTime = `${endHour.toString().padStart(2, '0')}:${minute}`;
      
      // Update the document
      await updateDoc(doc(db, 'events', eventDoc.id), {
        endTime: endTime
      });
      
      console.log(`✅ Updated "${data.title}": ${data.time} → ${endTime}`);
      updated++;
    }
    
    console.log('\n🎉 Migration completed!');
    console.log(`✅ Updated: ${updated} events`);
    console.log(`⏭️  Skipped: ${skipped} events`);
    console.log(`📊 Total: ${eventsSnapshot.size} events`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run the migration
migrateEvents()
  .then(() => {
    console.log('\n✨ All done! You can now safely use the endTime feature.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration error:', error);
    process.exit(1);
  });
