'use client';

import { useState, useRef, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { doc, updateDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Registration } from '@/types';
import toast from 'react-hot-toast';
import { CheckCircleIcon, XCircleIcon, QrCodeIcon } from '@heroicons/react/24/outline';

export default function QRScannerPage() {
  const { user } = useAuth();
  const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<any>(null);
  const [registration, setRegistration] = useState<Registration | null>(null);
  const scannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      return;
    }

    return () => {
      if (scanner) {
        scanner.clear();
      }
    };
  }, []);

  const startScanning = () => {
    if (scannerRef.current) {
      const html5QrcodeScanner = new Html5QrcodeScanner(
        "qr-scanner",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );

      html5QrcodeScanner.render(onScanSuccess, onScanFailure);
      setScanner(html5QrcodeScanner);
      setIsScanning(true);
    }
  };

  const stopScanning = () => {
    if (scanner) {
      scanner.clear();
      setScanner(null);
      setIsScanning(false);
    }
  };

  const onScanSuccess = async (decodedText: string) => {
    try {
      const qrData = JSON.parse(decodedText);
      setScannedData(qrData);

      // Find registration by registration number
      const registrationsRef = collection(db, 'registrations');
      const q = query(registrationsRef, where('registrationNumber', '==', qrData.registrationNumber));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        toast.error('Registration not found');
        return;
      }

      const regDoc = querySnapshot.docs[0];
      const regData = { id: regDoc.id, ...regDoc.data(), registeredAt: regDoc.data().registeredAt.toDate(), checkedInAt: regDoc.data().checkedInAt?.toDate() } as Registration;
      
      if (regData.checkedIn) {
        toast('Attendee already checked in', { icon: '⚠️' });
        setRegistration(regData);
        return;
      }

      // Update check-in status
      await updateDoc(doc(db, 'registrations', regDoc.id), {
        checkedIn: true,
        checkedInAt: new Date(),
      });

      setRegistration({ ...regData, checkedIn: true, checkedInAt: new Date() });
      toast.success(`Successfully checked in: ${regData.fullName}`);
      
      // Stop scanning after successful check-in
      stopScanning();
    } catch (error) {
      console.error('Error processing QR code:', error);
      toast.error('Invalid QR code format');
    }
  };

  const onScanFailure = (error: string) => {
    // Handle scan failure silently
  };

  const resetScanner = () => {
    setScannedData(null);
    setRegistration(null);
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
            {!isScanning && !scannedData && (
              <div className="text-center">
                <QrCodeIcon className="h-24 w-24 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Ready to Scan
                </h3>
                <p className="text-gray-600 mb-6">
                  Click the button below to start scanning QR codes
                </p>
                <button
                  onClick={startScanning}
                  className="btn-primary"
                >
                  Start Scanning
                </button>
              </div>
            )}

            {isScanning && (
              <div className="space-y-4">
                <div id="qr-scanner" ref={scannerRef}></div>
                <button
                  onClick={stopScanning}
                  className="btn-secondary w-full"
                >
                  Stop Scanning
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
                    {registration.checkedIn ? 'Check-in Successful' : 'Check-in Failed'}
                  </h3>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Attendee Details:</h4>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Name:</dt>
                      <dd className="font-medium">{registration.fullName}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Email:</dt>
                      <dd className="font-medium">{registration.email}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Registration Number:</dt>
                      <dd className="font-medium">{registration.registrationNumber}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Mobile:</dt>
                      <dd className="font-medium">{registration.mobileNumber}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Check-in Status:</dt>
                      <dd className={`font-medium ${
                        registration.checkedIn ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {registration.checkedIn ? 'Checked In' : 'Not Checked In'}
                      </dd>
                    </div>
                    {registration.checkedInAt && (
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Check-in Time:</dt>
                        <dd className="font-medium">
                          {registration.checkedInAt.toLocaleString()}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={resetScanner}
                    className="btn-secondary flex-1"
                  >
                    Scan Another
                  </button>
                  <button
                    onClick={startScanning}
                    className="btn-primary flex-1"
                  >
                    Continue Scanning
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-blue-50 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Instructions:</h3>
          <ul className="text-blue-800 text-sm space-y-1">
            <li>• Ensure good lighting for optimal scanning</li>
            <li>• Hold the QR code steady within the scanning frame</li>
            <li>• The system will automatically process valid QR codes</li>
            <li>• Already checked-in attendees will show a warning message</li>
          </ul>
        </div>
      </div>
    </div>
  );
}