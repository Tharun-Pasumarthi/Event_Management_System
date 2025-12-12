import { useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Event } from '@/types';
import { calculateEventStatus } from '@/lib/utils/eventUtils';

/**
 * Hook to automatically update event status based on current time
 * Checks status when component mounts and updates Firestore if changed
 */
export function useEventStatusChecker(event: Event | null) {
  useEffect(() => {
    if (!event) return;

    const checkAndUpdateStatus = async () => {
      try {
        // Calculate what the status should be
        const calculatedStatus = calculateEventStatus(
          event.date,
          event.time,
          event.endTime
        );

        // Only update if status has changed
        if (calculatedStatus !== event.status) {
          console.log(`Event ${event.id} status changed: ${event.status} → ${calculatedStatus}`);
          
          await updateDoc(doc(db, 'events', event.id), {
            status: calculatedStatus
          });

          console.log(`Event ${event.id} status updated to ${calculatedStatus}`);
        }
      } catch (error) {
        console.error('Error updating event status:', error);
      }
    };

    checkAndUpdateStatus();

    // Set up interval to check status every minute
    const interval = setInterval(checkAndUpdateStatus, 60000);

    return () => clearInterval(interval);
  }, [event]);
}

/**
 * Function to check and update all events' statuses
 * Can be called from admin dashboard or API route
 */
export async function updateAllEventsStatus(events: Event[]) {
  const updates = [];

  for (const event of events) {
    const calculatedStatus = calculateEventStatus(
      event.date,
      event.time,
      event.endTime
    );

    if (calculatedStatus !== event.status) {
      updates.push(
        updateDoc(doc(db, 'events', event.id), {
          status: calculatedStatus
        })
      );
    }
  }

  if (updates.length > 0) {
    await Promise.all(updates);
    console.log(`Updated ${updates.length} event statuses`);
  }

  return updates.length;
}
