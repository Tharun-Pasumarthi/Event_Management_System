'use client';

import { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Registration } from '@/types';
import toast from 'react-hot-toast';
import { CheckCircleIcon, XCircleIcon, QrCodeIcon } from '@heroicons/react/24/outline';

export default function QRScannerPage() {
  const { user } = useAuth();
  const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [manualEntry, setManualEntry] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);

  useEffect(() => {
    return () => {
      if (scanner) {
        try {
          scanner.clear();
        } catch (e) {
          // Scanner already cleared
        }
      }
    };
  }, [scanner]);

  const startScanning = async () => {
    console.log('=== STARTING SCANNER ===');
    try {
      // Request camera permissions first
      console.log('Requesting camera permissions...');
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ video: true });
        console.log('Camera permission granted');
      }
      
      console.log('Creating scanner instance...');
      const html5QrcodeScanner = new Html5QrcodeScanner(
        "qr-scanner",
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          disableFlip: false,
        },
        false
      );

      console.log('Rendering scanner...');
      html5QrcodeScanner.render(onScanSuccess, onScanFailure);
      setScanner(html5QrcodeScanner);
      setIsScanning(true);
      toast.success('📷 Scanner started - Point camera at QR code');
      console.log('Scanner started successfully');
    } catch (error) {
      console.error('=== SCANNER START ERROR ===');
      console.error('Error details:', error);
      toast.error('Camera permission denied. Please allow camera access and try again.');
    }
  };

  const stopScanning = () => {
    console.log('=== STOPPING SCANNER ===');
    if (scanner) {
      try {
        scanner.clear();
        console.log('Scanner cleared');
      } catch (e) {
        console.error('Error clearing scanner:', e);
      }
      setScanner(null);
      setIsScanning(false);
      toast('Scanner stopped', { icon: '⏹️' });
    }
  };

  const onScanSuccess = async (decodedText: string) => {
    try {
      console.log('=== QR SCAN SUCCESS ===');
      console.log('Raw decoded text:', decodedText);
      
      // Parse QR data
      const qrData = JSON.parse(decodedText);
      console.log('Parsed QR data:', qrData);
      
      // Validate QR data structure
      if (!qrData.registrationNumber || !qrData.eventId) {
        toast.error('Invalid QR code: Missing required data');
        console.error('Invalid QR data structure:', qrData);
        return;
      }

      // Find registration by registration number and event ID
      console.log('Searching for registration:', qrData.registrationNumber, 'Event:', qrData.eventId);
      const registrationsRef = collection(db, 'registrations');
      const q = query(
        registrationsRef, 
        where('registrationNumber', '==', qrData.registrationNumber),
        where('eventId', '==', qrData.eventId)
      );
      const querySnapshot = await getDocs(q);
      
      console.log('Query results:', querySnapshot.size, 'documents found');
      
      if (querySnapshot.empty) {
        toast.error('Registration not found in database');
        console.error('No registration found for:', qrData.registrationNumber);
        stopScanning();
        return;
      }

      const regDoc = querySnapshot.docs[0];
      const regData = { 
        id: regDoc.id, 
        ...regDoc.data(), 
        registeredAt: regDoc.data().registeredAt?.toDate() || new Date(), 
        checkedInAt: regDoc.data().checkedInAt?.toDate() 
      } as Registration;
      
      console.log('Registration found:', regData);
      
      if (regData.checkedIn) {
        toast('⚠️ Already checked in!', { 
          duration: 3000,
          style: {
            background: '#fef3c7',
            color: '#92400e',
          }
        });
        setRegistration(regData);
        stopScanning();
        return;
      }

      // Update check-in status
      console.log('Updating check-in status...');
      await updateDoc(doc(db, 'registrations', regDoc.id), {
        checkedIn: true,
        checkedInAt: new Date(),
      });

      const updatedReg = { ...regData, checkedIn: true, checkedInAt: new Date() };
      setRegistration(updatedReg);
      toast.success(`✅ Successfully checked in: ${regData.fullName}`, {
        duration: 5000,
        style: {
          background: '#10b981',
          color: '#ffffff',
        }
      });
      
      console.log('Check-in complete!');
      
      // Stop scanning after successful check-in
      setTimeout(() => {
        stopScanning();
      }, 2000);
    } catch (error) {
      console.error('=== QR SCAN ERROR ===');
      console.error('Error details:', error);
      
      if (error instanceof SyntaxError) {
        toast.error('Invalid QR code format - not valid JSON');
      } else {
        toast.error('Error processing QR code');
      }
    }
  };

  const onScanFailure = (error: any) => {
    // Silent - scanning in progress
  };

  const resetScanner = () => {
    setRegistration(null);
    setShowManualEntry(false);
    setManualEntry('');
  };

  const handleManualCheckIn = async () => {
    if (!manualEntry.trim()) {
      toast.error('Please enter a registration number');
      return;
    }

    try {
      console.log('=== MANUAL CHECK-IN ===');
      console.log('Manual check-in for:', manualEntry);
      const registrationsRef = collection(db, 'registrations');
      const q = query(registrationsRef, where('registrationNumber', '==', manualEntry.trim()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast.error('Registration number not found');
        return;
      }

      const regDoc = querySnapshot.docs[0];
      const regData = {
        id: regDoc.id,
        ...regDoc.data(),
        registeredAt: regDoc.data().registeredAt?.toDate() || new Date(),
        checkedInAt: regDoc.data().checkedInAt?.toDate()
      } as Registration;

      if (regData.checkedIn) {
        toast('⚠️ Already checked in!', {
          icon: '⚠️',
          duration: 3000,
        });
        setRegistration(regData);
        return;
      }

      await updateDoc(doc(db, 'registrations', regDoc.id), {
        checkedIn: true,
        checkedInAt: new Date(),
      });

      setRegistration({ ...regData, checkedIn: true, checkedInAt: new Date() });
      toast.success(`✅ Successfully checked in: ${regData.fullName}`);
      setManualEntry('');
      console.log('Manual check-in complete');
    } catch (error) {
      console.error('Manual check-in error:', error);
      toast.error('Error processing check-in');
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900">Access Denied</h2>
          <p className="text-gray-600">Only admins can access the QR scanner</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <QrCodeIcon className="h-8 w-8 mr-3 text-primary-600" />
              QR Code Scanner
            </h1>
            <p className="text-gray-600 mt-1">Scan attendee QR codes for event check-in</p>
          </div>

          <div className="p-6">
            {!isScanning && !registration && !showManualEntry && (
              <div className="text-center space-y-4">
                <QrCodeIcon className="h-24 w-24 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Ready to Scan
                </h3>
                <p className="text-gray-600 mb-6">
                  Scan QR code or enter registration number manually
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={startScanning}
                    className="btn-primary"
                  >
                    📷 Scan QR Code
                  </button>
                  <button
                    onClick={() => setShowManualEntry(true)}
                    className="btn-secondary"
                  >
                    ⌨️ Manual Entry
                  </button>
                </div>
              </div>
            )}

            {showManualEntry && !registration && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Manual Check-In</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Registration Number
                  </label>
                  <input
                    type="text"
                    value={manualEntry}
                    onChange={(e) => setManualEntry(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleManualCheckIn()}
                    placeholder="Enter 10-digit registration number"
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900"
                    maxLength={10}
                    autoFocus
                  />
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      setShowManualEntry(false);
                      setManualEntry('');
                    }}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleManualCheckIn}
                    className="btn-primary flex-1"
                  >
                    Check In
                  </button>
                </div>
              </div>
            )}

            {isScanning && (
              <div className="space-y-4">
                <div id="qr-scanner"></div>
                <button
                  onClick={stopScanning}
                  className="btn-secondary w-full"
                >
                  ⏹️ Stop Scanning
                </button>
              </div>
            )}

            {registration && (
              <div className="space-y-6">
                <div className="text-center">
                  {registration.checkedIn ? (
                    <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  ) : (
                    <XCircleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
                  )}
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {registration.checkedIn ? '✅ Check-in Successful' : '❌ Check-in Failed'}
                  </h3>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Attendee Details:</h4>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Name:</dt>
                      <dd className="font-medium text-gray-900">{registration.fullName}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Email:</dt>
                      <dd className="font-medium text-gray-900">{registration.email}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Registration #:</dt>
                      <dd className="font-medium text-gray-900">{registration.registrationNumber}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Mobile:</dt>
                      <dd className="font-medium text-gray-900">{registration.mobileNumber}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Event:</dt>
                      <dd className="font-medium text-gray-900">{registration.eventTitle}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Check-in Status:</dt>
                      <dd className={`font-medium ${
                        registration.checkedIn ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {registration.checkedIn ? '✅ Checked In' : '❌ Not Checked In'}
                      </dd>
                    </div>
                    {registration.checkedInAt && (
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Check-in Time:</dt>
                        <dd className="font-medium text-gray-900">
                          {registration.checkedInAt.toLocaleString()}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>

                <button
                  onClick={resetScanner}
                  className="btn-primary w-full"
                >
                  Scan Next Attendee
                </button>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2">📋 Instructions</h3>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• Click &quot;Scan QR Code&quot; and allow camera access</li>
              <li>• Point camera at attendee&apos;s QR code</li>
              <li>• System will automatically check them in</li>
              <li>• Use &quot;Manual Entry&quot; if QR code doesn&apos;t work</li>
              <li>• Check browser console for detailed logs</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
