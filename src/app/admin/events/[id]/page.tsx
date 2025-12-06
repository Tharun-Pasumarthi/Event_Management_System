'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Event, Registration } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function AdminEventDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/admin/dashboard');
      return;
    }
    if (id) {
      fetchEventDetails(id as string);
    }
  }, [id, user, router]);

  const fetchEventDetails = async (eventId: string) => {
    try {
      // Fetch event
      const eventDoc = await getDoc(doc(db, 'events', eventId));
      if (!eventDoc.exists()) {
        toast.error('Event not found');
        router.push('/admin/dashboard');
        return;
      }

      const eventData = {
        id: eventDoc.id,
        ...eventDoc.data(),
        date: eventDoc.data().date?.toDate() || new Date(),
        createdAt: eventDoc.data().createdAt?.toDate() || new Date(),
      } as Event;

      setEvent(eventData);

      // Fetch registrations for this event
      const regsQuery = query(
        collection(db, 'registrations'),
        where('eventId', '==', eventId)
      );
      const regsSnapshot = await getDocs(regsQuery);
      const regsData = regsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        registeredAt: doc.data().registeredAt?.toDate() || new Date(),
        checkedInAt: doc.data().checkedInAt?.toDate(),
      })) as Registration[];

      setRegistrations(regsData);
    } catch (error) {
      console.error('Error fetching event details:', error);
      toast.error('Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900">Event not found</h2>
          <Link href="/admin/dashboard" className="text-primary-600 hover:text-primary-700 mt-4 inline-block">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const checkedInCount = registrations.filter(r => r.checkedIn).length;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link href="/admin/dashboard" className="text-primary-600 hover:text-primary-700">
            ← Back to Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Event Header */}
          <div className="bg-primary-600 text-white p-6">
            <h1 className="text-3xl font-bold mb-2">{event.title}</h1>
            <div className="text-primary-100">
              <p>📅 {format(event.date, 'PPP')} at {event.time}</p>
              <p>📍 {event.location}</p>
              <p>⏱️ Duration: {event.duration}</p>
            </div>
          </div>

          {/* Event Details */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-600 mb-1">Total Registrations</h3>
                <p className="text-3xl font-bold text-blue-600">{registrations.length}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-600 mb-1">Checked In</h3>
                <p className="text-3xl font-bold text-green-600">{checkedInCount}</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-600 mb-1">Capacity</h3>
                <p className="text-3xl font-bold text-orange-600">{event.capacity}</p>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Description</h3>
              <p className="text-gray-600">{event.description}</p>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Status</h3>
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                event.status === 'upcoming' ? 'bg-green-100 text-green-800' :
                event.status === 'ongoing' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {event.status}
              </span>
            </div>

            {event.imageUrl && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Event Image</h3>
                <img src={event.imageUrl} alt={event.title} className="max-w-md rounded-lg shadow" />
              </div>
            )}

            <div className="flex gap-4">
              <Link
                href="/admin/scanner"
                className="btn-primary"
              >
                Scan QR Codes
              </Link>
              <Link
                href="/admin/attendees"
                className="btn-secondary"
              >
                View Attendees
              </Link>
              <Link
                href="/admin/certificates"
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Generate Certificates
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Registrations */}
        {registrations.length > 0 && (
          <div className="bg-white rounded-lg shadow-md mt-6 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Recent Registrations</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registration #</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registered At</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {registrations.slice(0, 10).map(reg => (
                    <tr key={reg.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {reg.fullName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {reg.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {reg.registrationNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          reg.checkedIn ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {reg.checkedIn ? 'Checked In' : 'Not Checked In'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(reg.registeredAt, 'PPp')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
