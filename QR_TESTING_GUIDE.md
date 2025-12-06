# QR Code Testing Guide

## What We Fixed

### Problem
QR code scanning wasn't working properly after deployment. Issues included:
- Scanner only validated registration number (could check into wrong events)
- No error logging for debugging
- Missing camera permissions handling
- Data structure mismatch between generation and scanning

### Solution Implemented
1. **Enhanced QR Data Structure**
   - Added: `eventId`, `eventTitle`, `timestamp`, `email`
   - Removed: `userId` (was confusing and unused)
   - Improved error correction level

2. **Scanner Improvements**
   - Validates BOTH `registrationNumber` AND `eventId`
   - Comprehensive console logging (=== QR SCAN SUCCESS ===)
   - Camera permission request with error handling
   - Better error messages (JSON parse detection)
   - Custom toast notifications
   - Auto-stop after 2 seconds on success

3. **Backup Option**
   - Manual entry for registration numbers
   - Allows check-in without QR scanning

## Testing Instructions

### Option 1: Using Test QR Page (Recommended)

1. **Access Test Page**
   ```
   http://localhost:3000/admin/test-qr
   ```

2. **Generate Test QR**
   - View recent registrations
   - Click any registration to generate QR
   - Review QR data structure in the panel

3. **Test Scanning**
   - Click "Test with Scanner" button
   - Grant camera permissions
   - Scan the generated QR code
   - Check console for detailed logs

4. **Verify Results**
   - Look for `=== QR SCAN SUCCESS ===` in console
   - Verify all data fields are correctly parsed
   - Confirm check-in status updates
   - Test with already checked-in registration

### Option 2: Real Registration Flow

1. **Create Registration**
   ```
   http://localhost:3000/events
   ```
   - Browse to an event
   - Complete registration form
   - Download or screenshot QR code

2. **Scan QR Code**
   ```
   http://localhost:3000/admin/scanner
   ```
   - Click "Scan QR Code"
   - Scan the registration QR
   - Verify check-in success

### Option 3: Manual Entry

1. **Get Registration Number**
   - From test page or registration email
   - 10-digit number

2. **Manual Check-In**
   ```
   http://localhost:3000/admin/scanner
   ```
   - Click "Manual Entry"
   - Enter 10-digit registration number
   - Click "Check In"

## What to Check

### Console Logs
Look for these log messages in browser console:

```
=== GENERATING QR CODE ===
Step 1: Preparing QR data
Step 2: Generating QR code with data: {registrationNumber, eventId, ...}
Step 3: QR code generated successfully

=== QR SCAN SUCCESS ===
Raw decoded text: {"registrationNumber":"...","eventId":"..."}
Parsed QR data: {registrationNumber, eventId, eventTitle, fullName, email, timestamp}
Querying registrations with: registrationNumber AND eventId
Registration found: {...}
Current check-in status: false/true
```

### Success Indicators
- ✅ QR code scans without errors
- ✅ Registration is found in database
- ✅ Check-in status updates correctly
- ✅ Toast notification shows success/already checked in
- ✅ Attendee details display properly
- ✅ Scanner stops after successful scan

### Error Cases to Test
1. **Invalid QR Code**
   - Scan random QR code
   - Should show "Invalid QR code format"

2. **Registration Not Found**
   - Edit QR data with fake registration number
   - Should show "Registration not found"

3. **Already Checked In**
   - Scan same QR twice
   - Should show "Already checked in!"

4. **Camera Permission Denied**
   - Deny camera access
   - Should show error message

## Data Structure Reference

### QR Code Contains
```json
{
  "registrationNumber": "1234567890",
  "eventId": "abc123",
  "eventTitle": "Event Name",
  "fullName": "John Doe",
  "email": "john@example.com",
  "timestamp": 1234567890123
}
```

### Scanner Validates
1. QR data is valid JSON
2. Has `registrationNumber` field
3. Has `eventId` field
4. Registration exists in Firestore
5. Registration matches both number AND event ID

## Troubleshooting

### QR Won't Scan
- Check camera permissions in browser
- Try better lighting
- Hold QR code steady
- Try manual entry as backup

### Registration Not Found
- Check console logs for exact error
- Verify registration exists in Firestore
- Check both registrationNumber and eventId match

### Camera Not Working
- Grant camera permissions
- Check if camera is in use by another app
- Try different browser
- Use manual entry option

### Scanner Stops Immediately
- Check console for errors
- Verify scanner initialization
- Try refreshing page

## Production Deployment

Before deploying:
1. ✅ Test all QR scenarios locally
2. ✅ Verify Firestore rules allow registration queries
3. ✅ Test on mobile devices
4. ✅ Check camera permissions on different browsers
5. ✅ Test manual entry backup option

After deploying:
1. Test QR scanning on production URL
2. Verify console logs work in production
3. Test on different devices/browsers
4. Monitor for any errors

## Quick Reference

### Development URLs
- Test QR Page: `/admin/test-qr`
- QR Scanner: `/admin/scanner`
- Dashboard: `/admin/dashboard`
- Events: `/events`

### Key Files
- QR Generation: `src/app/events/[id]/register/page.tsx`
- QR Scanner: `src/app/admin/scanner/page.tsx`
- Test Page: `src/app/admin/test-qr/page.tsx`

### Important Functions
- `handleSubmit()` - Generates QR code with correct structure
- `onScanSuccess()` - Validates and processes scanned QR
- `handleManualCheckIn()` - Backup check-in method

## Support

If issues persist:
1. Check browser console for detailed logs
2. Verify Firestore connection
3. Test with manual entry
4. Check Firestore rules
5. Review registration data in Firebase Console
