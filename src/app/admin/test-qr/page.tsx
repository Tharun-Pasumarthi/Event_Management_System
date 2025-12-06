'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import QRCode from 'qrcode';
import toast from 'react-hot-toast';

interface TestRegistration {
  id: string;
  registrationNumber: string;
  eventId: string;
  eventTitle: string;
  fullName: string;
  email: string;
  registeredAt: Date;
  checkedIn: boolean;
}

export default function TestQRPage() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  const [registrations, setRegistrations] = useState<TestRegistration[]>([]);
  const [selectedReg, setSelectedReg] = useState<TestRegistration | null>(null);
  const [qrUrl, setQrUrl] = useState('');
  const [qrData, setQrData] = useState<any>(null);
  const [loadingRegs, setLoadingRegs] = useState(true);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push('/admin/login');
    }
  }, [user, isAdmin, loading, router]);

  useEffect(() => {
    if (user && isAdmin) {
      fetchRecentRegistrations();
    }
  }, [user, isAdmin]);

  const fetchRecentRegistrations = async () => {
    try {
      const registrationsRef = collection(db, 'registrations');
      const q = query(
        registrationsRef,
        orderBy('registeredAt', 'desc'),
        limit(10)
      );
      const querySnapshot = await getDocs(q);
      const regs: TestRegistration[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        regs.push({
          id: doc.id,
          registrationNumber: data.registrationNumber,
          eventId: data.eventId,
          eventTitle: data.eventTitle,
          fullName: data.fullName,
          email: data.email,
          registeredAt: data.registeredAt?.toDate() || new Date(),
          checkedIn: data.checkedIn || false,
        });
      });
      setRegistrations(regs);
    } catch (error) {
      console.error('Error fetching registrations:', error);
      toast.error('Failed to load registrations');
    } finally {
      setLoadingRegs(false);
    }
  };

  const generateTestQR = async (reg: TestRegistration) => {
    try {
      // This matches the QR data structure from register page
      const qrDataObj = {
        registrationNumber: reg.registrationNumber,
        eventId: reg.eventId,
        eventTitle: reg.eventTitle,
        fullName: reg.fullName,
        email: reg.email,
        timestamp: Date.now(),
      };

      setQrData(qrDataObj);
      setSelectedReg(reg);

      const qrString = JSON.stringify(qrDataObj);
      console.log('Generating QR with data:', qrDataObj);
      console.log('QR string:', qrString);

      const url = await QRCode.toDataURL(qrString, {
        width: 400,
        margin: 2,
        errorCorrectionLevel: 'H',
      });

      setQrUrl(url);
      toast.success('QR code generated successfully');
    } catch (error) {
      console.error('Error generating QR:', error);
      toast.error('Failed to generate QR code');
    }
  };

  const copyQRData = () => {
    if (qrData) {
      navigator.clipboard.writeText(JSON.stringify(qrData, null, 2));
      toast.success('QR data copied to clipboard');
    }
  };

  if (loading || loadingRegs) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center text-primary-600 hover:text-primary-700"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">QR Code Testing</h1>
          <p className="text-gray-600 mt-2">
            Generate test QR codes and verify data structure
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Registrations List */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Recent Registrations
            </h2>
            <div className="space-y-3">
              {registrations.length === 0 ? (
                <p className="text-gray-600 text-center py-8">
                  No registrations found
                </p>
              ) : (
                registrations.map((reg) => (
                  <div
                    key={reg.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedReg?.id === reg.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-primary-300'
                    }`}
                    onClick={() => generateTestQR(reg)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{reg.fullName}</p>
                        <p className="text-sm text-gray-600">{reg.eventTitle}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Reg #: {reg.registrationNumber}
                        </p>
                      </div>
                      {reg.checkedIn && (
                        <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded">
                          Checked In
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* QR Code Display */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Generated QR Code
            </h2>
            {qrUrl ? (
              <div className="space-y-4">
                <div className="flex justify-center p-4 bg-gray-50 rounded-lg">
                  <img src={qrUrl} alt="QR Code" className="w-64 h-64" />
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-gray-900">QR Data Structure</h3>
                    <button
                      onClick={copyQRData}
                      className="text-sm text-primary-600 hover:text-primary-700"
                    >
                      📋 Copy
                    </button>
                  </div>
                  <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-xs">
                    {JSON.stringify(qrData, null, 2)}
                  </pre>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Testing Steps</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                    <li>Screenshot or scan this QR code with the scanner app</li>
                    <li>Verify all fields are correctly read</li>
                    <li>Check console logs for detailed scan information</li>
                    <li>Confirm check-in status updates correctly</li>
                  </ol>
                </div>

                <div className="flex gap-3">
                  <Link
                    href="/admin/scanner"
                    className="btn-primary flex-1 text-center"
                  >
                    Test with Scanner
                  </Link>
                  <button
                    onClick={() => {
                      setQrUrl('');
                      setQrData(null);
                      setSelectedReg(null);
                    }}
                    className="btn-secondary flex-1"
                  >
                    Clear
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg mb-2">No QR code generated</p>
                <p className="text-sm">Select a registration from the list to generate a test QR code</p>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">🧪 Testing Instructions</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• Select any registration from the list to generate its QR code</li>
            <li>• The QR data structure should match: registrationNumber, eventId, eventTitle, fullName, email, timestamp</li>
            <li>• Open the scanner page and scan the generated QR code</li>
            <li>• Check browser console for detailed logging (=== QR SCAN SUCCESS ===)</li>
            <li>• Verify that the scanner validates both registrationNumber AND eventId</li>
            <li>• Test manual entry as backup option</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
