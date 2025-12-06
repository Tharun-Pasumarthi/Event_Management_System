'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Event, Registration } from '@/types';
import Link from 'next/link';
import { 
  PlusIcon, 
  CalendarIcon, 
  UsersIcon, 
  QrCodeIcon,
  DocumentChartBarIcon 
} from '@heroicons/react/24/outline';

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      console.log('=== DASHBOARD DATA FETCH ===');
      
      // Fetch events
      console.log('Step 1: Fetching events...');
      const eventsQuery = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
      const eventsSnapshot = await getDocs(eventsQuery);
      const eventsData = eventsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.toDate(),
        createdAt: doc.data().createdAt.toDate(),
      })) as Event[];
      console.log(`Step 1 Complete: Found ${eventsData.length} events`, eventsData.map(e => ({ id: e.id, title: e.title })));

      // Fetch registrations
      console.log('Step 2: Fetching registrations...');
      const registrationsQuery = query(collection(db, 'registrations'), orderBy('registeredAt', 'desc'));
      const registrationsSnapshot = await getDocs(registrationsQuery);
      const registrationsData = registrationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        registeredAt: doc.data().registeredAt.toDate(),
        checkedInAt: doc.data().checkedInAt?.toDate(),
      })) as Registration[];
      console.log(`Step 2 Complete: Found ${registrationsData.length} registrations`);
      console.log('Registration details:', registrationsData.map(r => ({ 
        id: r.id, 
        eventId: r.eventId, 
        fullName: r.fullName,
        registrationNumber: r.registrationNumber 
      })));

      setEvents(eventsData);
      setRegistrations(registrationsData);
      console.log('=== DASHBOARD DATA FETCH COMPLETE ===');
    } catch (error) {
      console.error('=== DASHBOARD ERROR ===');
      console.error('Error fetching dashboard data:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error code:', (error as any).code);
      }
    } finally {
      setStatsLoading(false);
    }
  };

  if (loading || statsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  const totalEvents = events.length;
  const upcomingEvents = events.filter(e => e.status === 'upcoming').length;
  const totalRegistrations = registrations.length;
  const checkedInAttendees = registrations.filter(r => r.checkedIn).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome back, {user.displayName}</p>
            </div>
            <div className="flex space-x-3">
              <button 
                onClick={fetchDashboardData}
                className="btn-secondary flex items-center space-x-2"
              >
                <span>🔄 Refresh Data</span>
              </button>
              <Link href="/admin/events/create" className="btn-primary flex items-center space-x-2">
                <PlusIcon className="h-5 w-5" />
                <span>Create Event</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <CalendarIcon className="h-8 w-8 text-primary-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Events</p>
                <p className="text-2xl font-bold text-gray-900">{totalEvents}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <CalendarIcon className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Upcoming Events</p>
                <p className="text-2xl font-bold text-gray-900">{upcomingEvents}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <UsersIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Registrations</p>
                <p className="text-2xl font-bold text-gray-900">{totalRegistrations}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <QrCodeIcon className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Checked In</p>
                <p className="text-2xl font-bold text-gray-900">{checkedInAttendees}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link
            href="/admin/events/create"
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
          >
            <PlusIcon className="h-8 w-8 text-primary-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Create Event</h3>
            <p className="text-gray-600">Set up a new event with registration and QR codes</p>
          </Link>

          <Link
            href="/admin/scanner"
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
          >
            <QrCodeIcon className="h-8 w-8 text-green-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">QR Scanner</h3>
            <p className="text-gray-600">Scan attendee QR codes for event check-in</p>
          </Link>

          <Link
            href="/admin/attendees"
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
          >
            <DocumentChartBarIcon className="h-8 w-8 text-blue-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Manage Attendees</h3>
            <p className="text-gray-600">View and export attendee data</p>
          </Link>

          <Link
            href="/admin/certificates"
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
          >
            <UsersIcon className="h-8 w-8 text-purple-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Generate Certificates</h3>
            <p className="text-gray-600">Create and manage event participation certificates</p>
          </Link>

          <Link
            href="/admin/support"
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
          >
            <DocumentChartBarIcon className="h-8 w-8 text-orange-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Support Messages</h3>
            <p className="text-gray-600">View and respond to user support requests</p>
          </Link>
        </div>

        {/* Recent Events */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Recent Events</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Registrations
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="text-gray-500">
                        <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-lg font-medium">No events yet</p>
                        <p className="text-sm mt-1">Create your first event to get started</p>
                        <Link href="/admin/events/create" className="mt-4 inline-block btn-primary">
                          Create Event
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  events.slice(0, 5).map((event) => {
                    const eventRegistrations = registrations.filter(r => r.eventId === event.id);
                    return (
                      <tr key={event.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{event.title}</div>
                          <div className="text-sm text-gray-500">{event.location}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {event.date.toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            event.status === 'upcoming' ? 'bg-green-100 text-green-800' :
                            event.status === 'ongoing' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {event.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {eventRegistrations.length}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Link
                            href={`/admin/events/${event.id}`}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            View Details
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}