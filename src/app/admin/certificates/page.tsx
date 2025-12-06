'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where, addDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { Event, Registration, Certificate } from '@/types';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';

export default function CertificatesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    } else if (user) {
      fetchData();
    }
  }, [user, authLoading, router]);

  const fetchData = async () => {
    try {
      console.log('Fetching events, registrations, and certificates...');

      // Fetch events
      const eventsSnapshot = await getDocs(collection(db, 'events'));
      const eventsData = eventsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.toDate(),
        createdAt: doc.data().createdAt.toDate(),
      })) as Event[];

      // Fetch registrations
      const regsSnapshot = await getDocs(collection(db, 'registrations'));
      const regsData = regsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        registeredAt: doc.data().registeredAt.toDate(),
        checkedInAt: doc.data().checkedInAt?.toDate(),
      })) as Registration[];

      // Fetch certificates
      const certsSnapshot = await getDocs(collection(db, 'certificates'));
      const certsData = certsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        generatedAt: doc.data().generatedAt.toDate(),
      })) as Certificate[];

      setEvents(eventsData);
      setRegistrations(regsData);
      setCertificates(certsData);
      console.log('Data loaded:', { events: eventsData.length, registrations: regsData.length, certificates: certsData.length });
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const generateCertificate = async (registration: Registration, event: Event) => {
    try {
      // Check if certificate already exists
      const existingCert = certificates.find(
        cert => cert.registrationId === registration.id
      );

      if (existingCert) {
        toast.error('Certificate already generated for this attendee');
        return;
      }

      setGenerating(true);

      // Create PDF certificate
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Add certificate design
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Border
      pdf.setLineWidth(2);
      pdf.setDrawColor(30, 64, 175); // Blue
      pdf.rect(10, 10, pageWidth - 20, pageHeight - 20);

      // Inner border
      pdf.setLineWidth(0.5);
      pdf.rect(15, 15, pageWidth - 30, pageHeight - 30);

      // Title
      pdf.setFontSize(40);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(30, 64, 175);
      pdf.text('CERTIFICATE OF PARTICIPATION', pageWidth / 2, 40, { align: 'center' });

      // Subtitle
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      pdf.text('This is to certify that', pageWidth / 2, 60, { align: 'center' });

      // Attendee name
      pdf.setFontSize(32);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text(registration.fullName, pageWidth / 2, 80, { align: 'center' });

      // Event details
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      pdf.text('has successfully participated in', pageWidth / 2, 100, { align: 'center' });

      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(30, 64, 175);
      pdf.text(event.title, pageWidth / 2, 115, { align: 'center' });

      // Date and location
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      const eventDate = event.date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      pdf.text(`Date: ${eventDate}`, pageWidth / 2, 135, { align: 'center' });
      pdf.text(`Location: ${event.location}`, pageWidth / 2, 145, { align: 'center' });

      // Registration number
      pdf.setFontSize(12);
      pdf.text(`Registration No: ${registration.registrationNumber}`, pageWidth / 2, 160, { align: 'center' });

      // Signature line
      pdf.setLineWidth(0.5);
      pdf.line(pageWidth / 2 - 30, 180, pageWidth / 2 + 30, 180);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'italic');
      pdf.text('Authorized Signature', pageWidth / 2, 187, { align: 'center' });

      // Convert PDF to base64 for downloading
      const pdfBlob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);

      // Save certificate record to Firestore (without uploading to Storage)
      const certificateData = {
        eventId: event.id,
        userId: registration.userId,
        registrationId: registration.id,
        certificateUrl: '', // Empty for now since Storage isn't set up
        emailSent: false,
        generatedAt: new Date(),
      };

      const docRef = await addDoc(collection(db, 'certificates'), certificateData);
      
      // Update local state
      setCertificates([...certificates, { id: docRef.id, ...certificateData }]);

      toast.success('Certificate generated successfully!');
      
      // Download certificate directly
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `certificate-${registration.fullName}-${event.title}.pdf`;
      link.click();
      URL.revokeObjectURL(pdfUrl);
    } catch (error) {
      console.error('Error generating certificate:', error);
      toast.error('Failed to generate certificate');
    } finally {
      setGenerating(false);
    }
  };

  const generateBulkCertificates = async () => {
    if (!selectedEvent) {
      toast.error('Please select an event');
      return;
    }

    const event = events.find(e => e.id === selectedEvent);
    if (!event) return;

    const eventRegistrations = registrations.filter(
      reg => reg.eventId === selectedEvent && reg.checkedIn
    );

    if (eventRegistrations.length === 0) {
      toast.error('No checked-in attendees found for this event');
      return;
    }

    setGenerating(true);
    let successCount = 0;
    let errorCount = 0;

    for (const registration of eventRegistrations) {
      // Check if certificate already exists
      const existingCert = certificates.find(
        cert => cert.registrationId === registration.id
      );

      if (!existingCert) {
        try {
          await generateCertificate(registration, event);
          successCount++;
        } catch (error) {
          console.error('Error generating certificate for:', registration.fullName, error);
          errorCount++;
        }
      }
    }

    setGenerating(false);
    toast.success(`Generated ${successCount} certificates. ${errorCount} errors.`);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const filteredRegistrations = selectedEvent
    ? registrations.filter(reg => reg.eventId === selectedEvent && reg.checkedIn)
    : [];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Certificate Management</h1>

          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <label htmlFor="event" className="block text-sm font-medium text-gray-700 mb-2">
                Select Event
              </label>
              <select
                id="event"
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- Select an event --</option>
                {events.map(event => (
                  <option key={event.id} value={event.id}>
                    {event.title} - {event.date.toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={generateBulkCertificates}
                disabled={!selectedEvent || generating}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? 'Generating...' : 'Generate All Certificates'}
              </button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-800 text-sm">
              💡 <strong>Note:</strong> Certificates are generated only for attendees who have been checked in.
              Select an event and click &quot;Generate All Certificates&quot; to create certificates for all checked-in attendees.
            </p>
          </div>
        </div>

        {selectedEvent && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Attendees ({filteredRegistrations.length})
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Registration No.
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRegistrations.map((registration) => {
                    const cert = certificates.find(c => c.registrationId === registration.id);
                    const event = events.find(e => e.id === registration.eventId)!;

                    return (
                      <tr key={registration.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {registration.fullName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {registration.registrationNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {registration.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {cert ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              Generated
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {cert ? (
                            <button
                              onClick={() => {
                                // Regenerate and download PDF since we don't have Storage URL
                                toast('Regenerating certificate...');
                                generateCertificate(registration, event);
                              }}
                              className="text-blue-600 hover:text-blue-900 mr-4"
                            >
                              Download
                            </button>
                          ) : (
                            <button
                              onClick={() => generateCertificate(registration, event)}
                              disabled={generating}
                              className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                            >
                              Generate
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredRegistrations.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No checked-in attendees found for this event</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
