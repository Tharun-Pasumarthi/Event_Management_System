'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Event, Registration } from '@/types';
import { format } from 'date-fns';
import Link from 'next/link';

export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    fetchUserRegistrations();
  }, [user, router]);

  const fetchUserRegistrations = async () => {
    if (!user) return;

    try {
      // Fetch user's registrations
      const regsQuery = query(
        collection(db, 'registrations'),
        where('email', '==', user.email)
      );
      const regsSnapshot = await getDocs(regsQuery);
      const regsData = regsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        registeredAt: doc.data().registeredAt?.toDate() || new Date(),
        checkedInAt: doc.data().checkedInAt?.toDate(),
      })) as Registration[];

      setRegistrations(regsData);

      // Fetch events for those registrations
      if (regsData.length > 0) {
        const eventIds = Array.from(new Set(regsData.map(r => r.eventId)));
        const eventsData: Event[] = [];
        
        for (const eventId of eventIds) {
          const eventsSnapshot = await getDocs(collection(db, 'events'));
          const eventDoc = eventsSnapshot.docs.find(doc => doc.id === eventId);
          if (eventDoc) {
            eventsData.push({
              id: eventDoc.id,
              ...eventDoc.data(),
              date: eventDoc.data().date?.toDate() || new Date(),
              createdAt: eventDoc.data().createdAt?.toDate() || new Date(),
            } as Event);
          }
        }
        setEvents(eventsData);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* User Info */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">My Profile</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Name</p>
              <p className="text-lg font-semibold text-gray-900">{user?.displayName || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="text-lg font-semibold text-gray-900">{user?.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Role</p>
              <p className="text-lg font-semibold text-gray-900 capitalize">{user?.role}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Member Since</p>
              <p className="text-lg font-semibold text-gray-900">
                {user?.createdAt ? format(user.createdAt, 'PPP') : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Registrations */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">My Event Registrations</h2>
          </div>

          {registrations.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500 mb-4">You haven&apos;t registered for any events yet.</p>
              <Link href="/events" className="btn-primary inline-block">
                Browse Events
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registration #</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registered On</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {registrations.map(reg => {
                    const event = events.find(e => e.id === reg.eventId);
                    return (
                      <tr key={reg.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900">{event?.title || 'Event'}</p>
                            {event && (
                              <p className="text-sm text-gray-500">
                                {format(event.date, 'PPP')} at {event.time}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {reg.registrationNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {event ? format(event.date, 'MMM dd, yyyy') : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            reg.checkedIn 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {reg.checkedIn ? '✓ Checked In' : 'Registered'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {format(reg.registeredAt, 'PPp')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-2">Total Events</h3>
            <p className="text-4xl font-bold">{registrations.length}</p>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-2">Checked In</h3>
            <p className="text-4xl font-bold">
              {registrations.filter(r => r.checkedIn).length}
            </p>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-2">Upcoming</h3>
            <p className="text-4xl font-bold">
              {events.filter(e => e.date > new Date()).length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
