'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, query, orderBy, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SupportMessage } from '@/types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function AdminSupportPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<SupportMessage | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [filter, setFilter] = useState<'all' | 'new' | 'in-progress' | 'resolved'>('all');

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/');
      return;
    }
    fetchMessages();
  }, [user, router]);

  const fetchMessages = async () => {
    try {
      const messagesQuery = query(
        collection(db, 'supportMessages'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(messagesQuery);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        resolvedAt: doc.data().resolvedAt?.toDate(),
      })) as SupportMessage[];
      setMessages(data);
    } catch (error) {
      console.error('Error fetching support messages:', error);
      toast.error('Failed to load support messages');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (messageId: string, status: 'new' | 'in-progress' | 'resolved') => {
    try {
      const updateData: any = { status };
      if (status === 'resolved') {
        updateData.resolvedAt = new Date();
      }
      if (adminNotes) {
        updateData.adminNotes = adminNotes;
      }

      await updateDoc(doc(db, 'supportMessages', messageId), updateData);

      // Send email notification to user about status change
      const message = messages.find(m => m.id === messageId);
      if (message) {
        await fetch('/api/send-support-status-update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toEmail: message.email,
            toName: message.name,
            subject: message.subject,
            status,
            adminNotes: adminNotes || '',
          }),
        });
      }

      toast.success('Status updated and user notified via email');
      fetchMessages();
      setSelectedMessage(null);
      setAdminNotes('');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const filteredMessages = messages.filter(msg => 
    filter === 'all' || msg.status === filter
  );

  const getStatusBadge = (status: string) => {
    const styles = {
      new: 'bg-blue-100 text-blue-800',
      'in-progress': 'bg-yellow-100 text-yellow-800',
      resolved: 'bg-green-100 text-green-800',
    };
    return styles[status as keyof typeof styles] || styles.new;
  };

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
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Support Messages</h1>
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="btn-secondary"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6 p-4">
          <div className="flex space-x-4">
            {['all', 'new', 'in-progress', 'resolved'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-4 py-2 rounded-lg font-medium ${
                  filter === f
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1).replace('-', ' ')}
                <span className="ml-2 text-sm">
                  ({f === 'all' ? messages.length : messages.filter(m => m.status === f).length})
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Messages List */}
        {filteredMessages.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-500">No support messages found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMessages.map(msg => (
              <div key={msg.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{msg.subject}</h3>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusBadge(msg.status)}`}>
                        {msg.status.replace('-', ' ')}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>From:</strong> {msg.name} ({msg.email})</p>
                      <p><strong>Submitted:</strong> {format(msg.createdAt, 'PPp')}</p>
                      {msg.resolvedAt && (
                        <p><strong>Resolved:</strong> {format(msg.resolvedAt, 'PPp')}</p>
                      )}
                    </div>
                  </div>
                  <a
                    href={`mailto:${msg.email}?subject=Re: ${msg.subject}`}
                    className="btn-secondary text-sm"
                  >
                    📧 Reply via Email
                  </a>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <p className="text-gray-700 whitespace-pre-wrap">{msg.message}</p>
                </div>

                {msg.adminNotes && (
                  <div className="bg-blue-50 p-4 rounded-lg mb-4">
                    <p className="text-sm font-semibold text-blue-900 mb-1">Admin Notes:</p>
                    <p className="text-blue-800">{msg.adminNotes}</p>
                  </div>
                )}

                {selectedMessage?.id === msg.id ? (
                  <div className="border-t pt-4 mt-4">
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add notes (optional)"
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg mb-3 text-gray-900"
                      rows={3}
                    />
                    <div className="flex space-x-3">
                      <button
                        onClick={() => updateStatus(msg.id, 'in-progress')}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                      >
                        Mark In Progress
                      </button>
                      <button
                        onClick={() => updateStatus(msg.id, 'resolved')}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        Mark Resolved
                      </button>
                      <button
                        onClick={() => {
                          setSelectedMessage(null);
                          setAdminNotes('');
                        }}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex space-x-3">
                    {msg.status !== 'resolved' && (
                      <button
                        onClick={() => {
                          setSelectedMessage(msg);
                          setAdminNotes(msg.adminNotes || '');
                        }}
                        className="btn-primary text-sm"
                      >
                        Update Status
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
