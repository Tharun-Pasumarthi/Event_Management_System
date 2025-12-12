// Utility functions for event management

/**
 * Calculates event status based on current time, start time, and end time
 */
export function calculateEventStatus(
  eventDate: Date,
  startTime: string,
  endTime: string
): 'upcoming' | 'ongoing' | 'completed' {
  const now = new Date();
  
  // Parse start and end times
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  // Create start and end datetime objects
  const startDateTime = new Date(eventDate);
  startDateTime.setHours(startHour, startMinute, 0, 0);
  
  const endDateTime = new Date(eventDate);
  endDateTime.setHours(endHour, endMinute, 0, 0);
  
  // If end time is before start time, assume it's next day
  if (endDateTime < startDateTime) {
    endDateTime.setDate(endDateTime.getDate() + 1);
  }
  
  // Determine status
  if (now < startDateTime) {
    return 'upcoming';
  } else if (now >= startDateTime && now <= endDateTime) {
    return 'ongoing';
  } else {
    return 'completed';
  }
}

/**
 * Generates a random 10-character alphanumeric registration number
 * Format: Random mix like K8P2M9X4L1
 * Excludes confusing characters: 0, O, 1, I
 */
export function generateAlphanumericRegNumber(): string {
  // Safe characters (excluding 0, O, 1, I to avoid confusion)
  const chars = '234567899ABCDEFGHJKLMNPQRSTUVWXYZ';
  let regNumber = '';
  
  for (let i = 0; i < 10; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    regNumber += chars[randomIndex];
  }
  
  return regNumber;
}

/**
 * Validates alphanumeric registration number format
 * Must be exactly 10 characters, alphanumeric (A-Z, 0-9)
 */
export function validateRegistrationNumber(regNumber: string): boolean {
  const pattern = /^[A-Z0-9]{10}$/;
  return pattern.test(regNumber);
}

/**
 * Format time string for display
 */
export function formatTime(time: string): string {
  const [hour, minute] = time.split(':');
  const hourNum = parseInt(hour);
  const ampm = hourNum >= 12 ? 'PM' : 'AM';
  const displayHour = hourNum % 12 || 12;
  return `${displayHour}:${minute} ${ampm}`;
}

/**
 * Calculate duration between start and end time
 */
export function calculateDuration(startTime: string, endTime: string): string {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  let durationMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
  
  // Handle overnight events
  if (durationMinutes < 0) {
    durationMinutes += 24 * 60;
  }
  
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  
  if (hours === 0) {
    return `${minutes} minutes`;
  } else if (minutes === 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  } else {
    return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} min`;
  }
}
