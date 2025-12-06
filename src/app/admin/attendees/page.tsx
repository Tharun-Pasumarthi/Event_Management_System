'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Event, Registration } from '@/types';
import { DocumentArrowDownIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function AttendeesPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState<Registration[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [registrations, selectedEvent, statusFilter]);

  const fetchData = async () => {
    try {
      console.log('=== ATTENDEES PAGE DATA FETCH ===');
      
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
      console.log(`Step 1 Complete: Found ${eventsData.length} events`);

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
      console.log('Registration sample:', registrationsData.slice(0, 3).map(r => ({
        id: r.id,
        eventId: r.eventId,
        fullName: r.fullName
      })));

      setEvents(eventsData);
      setRegistrations(registrationsData);
      console.log('=== ATTENDEES PAGE DATA FETCH COMPLETE ===');
    } catch (error) {
      console.error('=== ATTENDEES PAGE ERROR ===');
      console.error('Error fetching data:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error code:', (error as any).code);
      }
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...registrations];

    // Filter by event
    if (selectedEvent !== 'all') {
      filtered = filtered.filter(reg => reg.eventId === selectedEvent);
    }

    // Filter by status
    if (statusFilter === 'checked-in') {
      filtered = filtered.filter(reg => reg.checkedIn);
    } else if (statusFilter === 'not-checked-in') {
      filtered = filtered.filter(reg => !reg.checkedIn);
    }

    setFilteredRegistrations(filtered);
  };

  const exportToCSV = () => {
    const csvData = filteredRegistrations.map(reg => {
      const event = events.find(e => e.id === reg.eventId);
      return {
        'Registration Number': reg.registrationNumber,
        'Full Name': reg.fullName,
        'Email': reg.email,
        'Mobile Number': reg.mobileNumber,
        'Event': event?.title || 'Unknown Event',
        'Registered At': format(reg.registeredAt, 'yyyy-MM-dd HH:mm:ss'),
        'Check-in Status': reg.checkedIn ? 'Checked In' : 'Not Checked In',
        'Checked In At': reg.checkedInAt ? format(reg.checkedInAt, 'yyyy-MM-dd HH:mm:ss') : 'N/A',
      };
    });

    const csvContent = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `attendees-${selectedEvent === 'all' ? 'all-events' : 'event'}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getEventTitle = (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    return event?.title || 'Unknown Event';
  };

  const sendReminders = async () => {
    if (selectedEvent === '' || selectedEvent === 'all') {
      toast.error('Please select a specific event to send reminders');
      return;
    }

    const event = events.find(e => e.id === selectedEvent);
    if (!event) {
      toast.error('Event not found');
      return;
    }

    const eventRegistrations = registrations.filter(r => r.eventId === selectedEvent);
    if (eventRegistrations.length === 0) {
      toast.error('No registrations found for this event');
      return;
    }

    try {
      toast('Sending reminder emails...');
      const response = await fetch('/api/send-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrations: eventRegistrations,
          event: {
            ...event,
            date: event.date.toISOString(),
          },
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error('Failed to send reminders');
      }
    } catch (error) {
      console.error('Reminder error:', error);
      toast.error('Failed to send reminders');
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900">Access Denied</h2>
          <p className="text-gray-600">Only admins can access attendee management</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Attendee Management</h1>
                <p className="text-gray-600 mt-1">
                  {filteredRegistrations.length} attendees found
                </p>
              </div>
              <div className="flex gap-2">
                <div className="relative group">
                  <button
                    onClick={sendReminders}
                    disabled={selectedEvent === '' || selectedEvent === 'all' || filteredRegistrations.length === 0}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    <span>📧</span>
                    <span>Send Reminders</span>
                  </button>
                  {(selectedEvent === '' || selectedEvent === 'all') && (
                    <div className="absolute bottom-full mb-2 left-0 bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      Select a specific event to send reminders
                    </div>
                  )}
                </div>
                <button
                  onClick={exportToCSV}
                  disabled={filteredRegistrations.length === 0}
                  className="btn-primary flex items-center space-x-2"
                >
                  <DocumentArrowDownIcon className="h-5 w-5" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              <FunnelIcon className="h-5 w-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filters:</span>
              
              <select
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm"
              >
                <option value="all">All Events</option>
                {events.map(event => (
                  <option key={event.id} value={event.id}>
                    {event.title}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm"
              >
                <option value="all">All Status</option>
                <option value="checked-in">Checked In</option>
                <option value="not-checked-in">Not Checked In</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Attendee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Registration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dates
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRegistrations.map((registration) => (
                  <tr key={registration.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {registration.fullName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {registration.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getEventTitle(registration.eventId)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {registration.registrationNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {registration.mobileNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        registration.checkedIn 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {registration.checkedIn ? 'Checked In' : 'Registered'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>
                        Registered: {format(registration.registeredAt, 'MMM dd, yyyy')}
                      </div>
                      {registration.checkedInAt && (
                        <div>
                          Checked In: {format(registration.checkedInAt, 'MMM dd, yyyy HH:mm')}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredRegistrations.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No attendees found with current filters</p>
              </div>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Registrations</h3>
            <p className="text-3xl font-bold text-primary-600">{filteredRegistrations.length}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Checked In</h3>
            <p className="text-3xl font-bold text-green-600">
              {filteredRegistrations.filter(r => r.checkedIn).length}
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Check-in Rate</h3>
            <p className="text-3xl font-bold text-blue-600">
              {filteredRegistrations.length > 0 
                ? Math.round((filteredRegistrations.filter(r => r.checkedIn).length / filteredRegistrations.length) * 100)
                : 0}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}