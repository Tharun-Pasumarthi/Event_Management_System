'use client';

import { useState, useEffect } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Registration } from '@/types';
import toast from 'react-hot-toast';
import { CheckCircleIcon, XCircleIcon, QrCodeIcon } from '@heroicons/react/24/outline';

export default function QRScannerPage() {
  const { user } = useAuth();
  const [scanner, setScanner] = useState<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [manualEntry, setManualEntry] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');

  useEffect(() => {
    // Get available cameras
    Html5Qrcode.getCameras().then(devices => {
      if (devices && devices.length) {
        setCameras(devices);
        // Prefer back camera for mobile
        const backCamera = devices.find(d => d.label.toLowerCase().includes('back'));
        setSelectedCamera(backCamera?.id || devices[0].id);
        console.log('Available cameras:', devices);
      }
    }).catch(err => {
      console.error('Error getting cameras:', err);
    });

    return () => {
      if (scanner) {
        stopScanning();
      }
    };
  }, []);

  const startScanning = async () => {
    console.log('=== STARTING SCANNER ===');
    
    // Set scanning state first to render the qr-reader element
    setIsScanning(true);
    
    // Wait for DOM to update
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Now check if we have the qr-reader element
    const readerElement = document.getElementById('qr-reader');
    if (!readerElement) {
      console.error('qr-reader element not found in DOM after waiting');
      toast.error('Scanner initialization failed. Using manual entry instead.');
      setIsScanning(false);
      setShowManualEntry(true);
      return;
    }
    
    try {
      // Request camera permissions first
      console.log('Requesting camera permissions...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      console.log('Camera permission granted');
      
      // Stop the test stream
      stream.getTracks().forEach(track => track.stop());
      
      // Create scanner instance
      console.log('Creating scanner instance...');
      const html5QrCode = new Html5Qrcode("qr-reader", false);
      
      console.log('Starting camera...');
      
      // Try with camera ID first, fall back to facing mode
      let cameraConfig = selectedCamera && selectedCamera !== '' 
        ? selectedCamera 
        : { facingMode: 'environment' };
      
      console.log('Using camera config:', cameraConfig);
      
      await html5QrCode.start(
        cameraConfig,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.777778,
          disableFlip: false,
        },
        onScanSuccess,
        onScanFailure
      );

      setScanner(html5QrCode);
      toast.success('📷 Scanner active - Position QR code in frame');
      console.log('Scanner started successfully');
    } catch (error: any) {
      console.error('=== SCANNER START ERROR ===');
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Full error:', error);
      
      setIsScanning(false);
      
      if (error.name === 'NotAllowedError' || error.message?.includes('Permission')) {
        toast.error('Camera permission denied. Please allow camera access in browser settings.', {
          duration: 5000,
        });
      } else if (error.name === 'NotFoundError' || error.message?.includes('camera')) {
        toast.error('No camera found. Please ensure your device has a working camera.', {
          duration: 5000,
        });
      } else if (error.message?.includes('already in use')) {
        toast.error('Camera is being used by another application. Please close other apps and try again.', {
          duration: 5000,
        });
      } else {
        toast.error('Failed to start scanner. Use manual entry below.', {
          duration: 5000,
        });
      }
      
      // Show manual entry as fallback
      setShowManualEntry(true);
    }
  };

  const stopScanning = async () => {
    console.log('=== STOPPING SCANNER ===');
    if (scanner) {
      try {
        if (scanner.getState() === Html5QrcodeScannerState.SCANNING) {
          await scanner.stop();
          console.log('Scanner stopped');
        }
        scanner.clear();
        console.log('Scanner cleared');
      } catch (e) {
        console.error('Error stopping scanner:', e);
      }
      setScanner(null);
      setIsScanning(false);
    }
  };

  const onScanSuccess = async (decodedText: string, decodedResult: any) => {
    console.log('=== QR SCAN SUCCESS ===');
    console.log('Raw decoded text:', decodedText);
    
    // Stop scanning immediately to prevent multiple scans
    if (scanner) {
      try {
        await scanner.pause();
      } catch (e) {
        console.error('Error pausing scanner:', e);
      }
    }

    try {
      // Parse QR data
      const qrData = JSON.parse(decodedText);
      console.log('Parsed QR data:', qrData);
      
      // Validate QR data structure
      if (!qrData.registrationNumber || !qrData.eventId) {
        toast.error('Invalid QR code: Missing required data');
        console.error('Invalid QR data structure:', qrData);
        if (scanner) await scanner.resume();
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
        await stopScanning();
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
        toast('⚠️ Already checked in at ' + regData.checkedInAt?.toLocaleTimeString(), { 
          duration: 4000,
          style: {
            background: '#fef3c7',
            color: '#92400e',
            fontWeight: 'bold',
          }
        });
        setRegistration(regData);
        await stopScanning();
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
      
      toast.success(`✅ ${regData.fullName} checked in successfully!`, {
        duration: 5000,
        style: {
          background: '#10b981',
          color: '#ffffff',
          fontWeight: 'bold',
          fontSize: '16px',
        }
      });
      
      console.log('Check-in complete!');
      
      // Stop scanning after successful check-in
      await stopScanning();
    } catch (error) {
      console.error('=== QR SCAN ERROR ===');
      console.error('Error details:', error);
      
      if (error instanceof SyntaxError) {
        toast.error('Invalid QR code format');
      } else {
        toast.error('Error processing QR code');
      }
      
      if (scanner) {
        try {
          await scanner.resume();
        } catch (e) {
          console.error('Error resuming scanner:', e);
        }
      }
    }
  };

  const onScanFailure = (error: any) => {
    // Silent - normal scanning behavior
    // Only log actual errors, not "QR code not found"
    if (error && !error.includes('NotFoundException')) {
      console.log('Scan error:', error);
    }
  };

  const resetScanner = () => {
    setRegistration(null);
    setShowManualEntry(false);
    setManualEntry('');
  };

  const handleManualCheckIn = async () => {
    if (!manualEntry.trim() || manualEntry.trim().length !== 10) {
      toast.error('Please enter a valid 10-digit registration number');
      return;
    }

    try {
      console.log('=== MANUAL CHECK-IN ===');
      console.log('Searching for registration:', manualEntry.trim());
      
      const registrationsRef = collection(db, 'registrations');
      const q = query(registrationsRef, where('registrationNumber', '==', manualEntry.trim()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast.error('Registration number not found in database');
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
        toast('⚠️ Already checked in at ' + regData.checkedInAt?.toLocaleTimeString(), {
          duration: 3000,
          style: {
            background: '#fef3c7',
            color: '#92400e',
          }
        });
        setRegistration(regData);
        return;
      }

      await updateDoc(doc(db, 'registrations', regDoc.id), {
        checkedIn: true,
        checkedInAt: new Date(),
      });

      setRegistration({ ...regData, checkedIn: true, checkedInAt: new Date() });
      toast.success(`✅ ${regData.fullName} checked in successfully!`, {
        duration: 4000,
        style: {
          background: '#10b981',
          color: '#ffffff',
          fontWeight: 'bold',
        }
      });
      setManualEntry('');
      console.log('Manual check-in complete');
    } catch (error) {
      console.error('Manual check-in error:', error);
      toast.error('Error processing check-in. Please try again.');
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center bg-white p-8 rounded-lg shadow-md">
          <XCircleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Only admins can access the QR scanner</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <QrCodeIcon className="h-10 w-10 text-white mr-3" />
                <div>
                  <h1 className="text-2xl font-bold text-white">QR Code Scanner</h1>
                  <p className="text-primary-100 text-sm mt-1">Event Check-in System</p>
                </div>
              </div>
              {cameras.length > 1 && isScanning && (
                <select
                  value={selectedCamera}
                  onChange={(e) => {
                    setSelectedCamera(e.target.value);
                    stopScanning();
                    setTimeout(() => startScanning(), 500);
                  }}
                  className="px-3 py-1 bg-white text-gray-900 rounded-lg text-sm"
                >
                  {cameras.map(camera => (
                    <option key={camera.id} value={camera.id}>
                      {camera.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="p-6">
            {!isScanning && !registration && !showManualEntry && (
              <div className="text-center space-y-6 py-8">
                <div className="w-32 h-32 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center mx-auto">
                  <QrCodeIcon className="h-16 w-16 text-primary-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Ready to Scan
                  </h3>
                  <p className="text-gray-600 mb-8 max-w-md mx-auto">
                    Start scanning attendee QR codes or enter registration numbers manually
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
                  <button
                    onClick={startScanning}
                    className="btn-primary flex items-center justify-center gap-2 py-4"
                  >
                    <span className="text-2xl">📷</span>
                    <span className="font-semibold">Scan QR Code</span>
                  </button>
                  <button
                    onClick={() => setShowManualEntry(true)}
                    className="btn-secondary flex items-center justify-center gap-2 py-4"
                  >
                    <span className="text-2xl">⌨️</span>
                    <span className="font-semibold">Manual Entry</span>
                  </button>
                </div>
              </div>
            )}

            {showManualEntry && !registration && (
              <div className="max-w-md mx-auto space-y-6 py-8">
                <div className="text-center">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Manual Check-In</h3>
                  <p className="text-gray-600 text-sm">Enter 10-digit registration number</p>
                </div>
                <div>
                  <input
                    type="text"
                    value={manualEntry}
                    onChange={(e) => setManualEntry(e.target.value.replace(/\D/g, ''))}
                    onKeyPress={(e) => e.key === 'Enter' && handleManualCheckIn()}
                    placeholder="0000000000"
                    className="w-full px-6 py-4 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 text-center text-2xl font-mono tracking-wider"
                    maxLength={10}
                    autoFocus
                  />
                  <p className="text-sm text-gray-500 text-center mt-2">
                    {manualEntry.length}/10 digits
                  </p>
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      setShowManualEntry(false);
                      setManualEntry('');
                    }}
                    className="btn-secondary flex-1 py-3"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleManualCheckIn}
                    disabled={manualEntry.length !== 10}
                    className="btn-primary flex-1 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Check In
                  </button>
                </div>
              </div>
            )}

            {isScanning && (
              <div className="space-y-6">
                <div className="bg-black rounded-xl overflow-hidden shadow-2xl" style={{ minHeight: '400px' }}>
                  <div id="qr-reader"></div>
                </div>
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">💡</span>
                    <div className="flex-1">
                      <h4 className="font-semibold text-blue-900 mb-2">Scanning Tips:</h4>
                      <ul className="space-y-1 text-sm text-blue-800">
                        <li>• Position QR code within the yellow frame</li>
                        <li>• Hold steady for 1-2 seconds</li>
                        <li>• Ensure good lighting conditions</li>
                        <li>• Keep QR code flat and unfolded</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <button
                  onClick={stopScanning}
                  className="btn-secondary w-full py-3 font-semibold"
                >
                  ⏹️ Stop Scanning
                </button>
              </div>
            )}

            {registration && (
              <div className="space-y-6 py-4">
                <div className="text-center">
                  {registration.checkedIn ? (
                    <>
                      <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircleIcon className="h-16 w-16 text-green-600" />
                      </div>
                      <h3 className="text-2xl font-bold text-green-600 mb-2">
                        ✅ Check-in Successful!
                      </h3>
                    </>
                  ) : (
                    <>
                      <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <XCircleIcon className="h-16 w-16 text-red-600" />
                      </div>
                      <h3 className="text-2xl font-bold text-red-600 mb-2">
                        ❌ Check-in Failed
                      </h3>
                    </>
                  )}
                </div>

                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
                  <h4 className="font-bold text-gray-900 mb-4 text-lg flex items-center">
                    <span className="mr-2">👤</span>
                    Attendee Information
                  </h4>
                  <dl className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <dt className="text-gray-600 font-medium">Name:</dt>
                      <dd className="font-semibold text-gray-900">{registration.fullName}</dd>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <dt className="text-gray-600 font-medium">Email:</dt>
                      <dd className="font-medium text-gray-900 text-sm">{registration.email}</dd>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <dt className="text-gray-600 font-medium">Registration #:</dt>
                      <dd className="font-mono font-bold text-primary-600">{registration.registrationNumber}</dd>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <dt className="text-gray-600 font-medium">Mobile:</dt>
                      <dd className="font-medium text-gray-900">{registration.mobileNumber}</dd>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <dt className="text-gray-600 font-medium">Event:</dt>
                      <dd className="font-semibold text-gray-900">{registration.eventTitle}</dd>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <dt className="text-gray-600 font-medium">Status:</dt>
                      <dd>
                        {registration.checkedIn ? (
                          <span className="px-4 py-1.5 bg-green-100 text-green-800 rounded-full text-sm font-bold">
                            ✅ Checked In
                          </span>
                        ) : (
                          <span className="px-4 py-1.5 bg-red-100 text-red-800 rounded-full text-sm font-bold">
                            ❌ Not Checked In
                          </span>
                        )}
                      </dd>
                    </div>
                    {registration.checkedInAt && (
                      <div className="flex justify-between items-center py-2 bg-green-50 px-4 rounded-lg">
                        <dt className="text-green-700 font-medium">Check-in Time:</dt>
                        <dd className="font-semibold text-green-900">
                          {registration.checkedInAt.toLocaleString()}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>

                <button
                  onClick={resetScanner}
                  className="btn-primary w-full py-4 font-bold text-lg"
                >
                  ➡️ Scan Next Attendee
                </button>
              </div>
            )}
          </div>

          {/* Footer Instructions */}
          {!registration && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <span className="mr-2">📋</span>
                Quick Guide
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">QR Scanner:</h4>
                  <ul className="space-y-1">
                    <li>• Click &quot;Scan QR Code&quot; button</li>
                    <li>• Allow camera permissions</li>
                    <li>• Point at attendee&apos;s QR code</li>
                    <li>• Wait for automatic check-in</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Manual Entry:</h4>
                  <ul className="space-y-1">
                    <li>• Click &quot;Manual Entry&quot; button</li>
                    <li>• Enter 10-digit registration number</li>
                    <li>• Press Enter or click Check In</li>
                    <li>• View check-in confirmation</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Debug Info - Only for admins */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-xs text-yellow-800 font-mono">
              Debug: Scanner Active: {isScanning ? 'Yes' : 'No'} | 
              Cameras: {cameras.length} | 
              Selected: {selectedCamera || 'None'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
