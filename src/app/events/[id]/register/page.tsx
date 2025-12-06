'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Event, Registration } from '@/types';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';
import { format } from 'date-fns';

interface RegistrationForm {
  registrationNumber: string;
  fullName: string;
  email: string;
  mobileNumber: string;
}

export default function EventRegistrationPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [qrCode, setQrCode] = useState<string>('');
  const [registered, setRegistered] = useState(false);

  const generateRegistrationNumber = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `REG-${timestamp}-${random}`.toUpperCase();
  };

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<RegistrationForm>({
    defaultValues: {
      email: user?.email || '',
      fullName: user?.displayName || '',
      registrationNumber: '',
    }
  });

  useEffect(() => {
    // Debug: Check user and auth state
    console.log('User state:', user);
    console.log('Auth state:', !!user);
  }, [user]);

  useEffect(() => {
    if (id) {
      fetchEvent(id as string);
    }
  }, [id]);

  const fetchEvent = async (eventId: string) => {
    try {
      const eventDoc = await getDoc(doc(db, 'events', eventId));
      if (eventDoc.exists()) {
        const eventData = {
          id: eventDoc.id,
          ...eventDoc.data(),
          date: eventDoc.data().date.toDate(),
          createdAt: eventDoc.data().createdAt.toDate(),
        } as Event;
        setEvent(eventData);
      } else {
        toast.error('Event not found');
        router.push('/');
      }
    } catch (error) {
      console.error('Error fetching event:', error);
      toast.error('Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: RegistrationForm) => {
    if (!event || !user) {
      console.error('Missing prerequisites:', { event: !!event, user: !!user });
      toast.error('Missing event or user information');
      return;
    }
    
    setSubmitting(true);
    
    try {
      console.log('=== REGISTRATION DEBUG ===');
      console.log('Step 1: Validating user...');
      console.log('User ID:', user.id);
      console.log('User Email:', user.email);
      console.log('Event ID:', event.id);
      
      // Validate required fields
      if (!data.registrationNumber || !data.fullName || !data.email || !data.mobileNumber) {
        toast.error('Please fill in all required fields');
        setSubmitting(false);
        return;
      }

      console.log('Step 2: All fields validated');

      // Generate QR code data
      const qrData = JSON.stringify({
        registrationNumber: data.registrationNumber,
        eventId: event.id,
        userId: user.id,
        eventTitle: event.title,
        attendeeName: data.fullName,
      });
      
      console.log('Step 3: Generating QR code...');
      // Generate QR code image
      const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#1e40af',
          light: '#ffffff'
        }
      });

      console.log('Step 4: QR code generated');
      
      // Save registration to Firestore
      const registrationData = {
        eventId: event.id,
        userId: user.id,
        registrationNumber: data.registrationNumber,
        fullName: data.fullName,
        email: data.email,
        mobileNumber: data.mobileNumber,
        qrCode: qrCodeDataUrl,
        checkedIn: false,
        registeredAt: new Date(),
      };

      console.log('Step 5: Saving to Firestore with data:', {
        eventId: registrationData.eventId,
        userId: registrationData.userId,
        fullName: registrationData.fullName,
        registrationNumber: registrationData.registrationNumber
      });

      const docRef = await addDoc(collection(db, 'registrations'), registrationData);
      console.log('Step 6: Registration saved with ID:', docRef.id);
      
      // Send confirmation email
      try {
        console.log('Step 7: Sending confirmation email...');
        const emailResponse = await fetch('/api/send-registration-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: data.email,
            eventTitle: event.title,
            eventDate: event.date.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            }),
            eventTime: event.time,
            eventLocation: event.location,
            registrationNumber: data.registrationNumber,
            attendeeName: data.fullName,
            qrCode: qrCodeDataUrl,
          }),
        });
        
        if (emailResponse.ok) {
          console.log('Email sent successfully');
        } else {
          console.warn('Email sending failed, but registration succeeded');
        }
      } catch (emailError) {
        console.warn('Email sending error (non-critical):', emailError);
      }
      
      console.log('=== REGISTRATION COMPLETE ===');
      
      setQrCode(qrCodeDataUrl);
      setRegistered(true);
      toast.success('Registration successful! Check your email for confirmation.');
    } catch (error) {
      console.error('=== REGISTRATION ERROR ===');
      console.error('Full error:', error);
      
      // More specific error messages
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error code:', (error as any).code);
        
        if (error.message.includes('permission') || (error as any).code === 'permission-denied') {
          console.error('Permission denied - check Firestore rules');
          toast.error('Permission denied. Update your Firebase security rules.');
        } else if (error.message.includes('network')) {
          toast.error('Network error. Please check your connection.');
        } else if (error.message.includes('MISSING_OR_INSUFFICIENT_PERMISSIONS')) {
          toast.error('Firebase permission error. Check your security rules.');
        } else {
          toast.error(`Registration failed: ${error.message}`);
        }
      } else {
        toast.error('Registration failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const downloadQRCode = () => {
    const link = document.createElement('a');
    link.download = `qr-code-${event?.title}-${Date.now()}.png`;
    link.href = qrCode;
    link.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!event) {
    return <div>Event not found</div>;
  }

  if (!user) {
    router.push('/auth/login');
    return null;
  }

  if (registered) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-green-600 mb-2">
                Registration Successful!
              </h1>
              <p className="text-gray-600">
                You have successfully registered for {event.title}
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Your QR Code</h2>
              <img src={qrCode} alt="QR Code" className="mx-auto mb-4" />
              <p className="text-sm text-gray-600 mb-4">
                Save this QR code for event check-in
              </p>
              <button
                onClick={downloadQRCode}
                className="btn-primary"
              >
                Download QR Code
              </button>
            </div>

            <div className="text-left bg-blue-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 mb-2">Event Details:</h3>
              <p className="text-blue-800">📅 {format(event.date, 'PPP')}</p>
              <p className="text-blue-800">🕐 {event.time}</p>
              <p className="text-blue-800">📍 {event.location}</p>
            </div>

            <button
              onClick={() => router.push('/')}
              className="btn-secondary"
            >
              Back to Events
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Event Header */}
          <div className="bg-primary-600 text-white p-6">
            <h1 className="text-2xl font-bold mb-2">{event.title}</h1>
            <div className="text-primary-100">
              <p>📅 {format(event.date, 'PPP')} at {event.time}</p>
              <p>📍 {event.location}</p>
            </div>
          </div>

          {/* Registration Form */}
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-6">Register for this Event</h2>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label htmlFor="registrationNumber" className="block text-sm font-medium text-gray-700 mb-2">
                  Registration Number (10 digits) *
                </label>
                <input
                  {...register('registrationNumber', { 
                    required: 'Registration number is required',
                    pattern: {
                      value: /^[0-9,A-Z]{10}$/,
                      message: 'Registration number must be exactly 10 digits'
                    }
                  })}
                  type="text"
                  maxLength={10}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 bg-white text-gray-900 placeholder-gray-500 font-medium"
                  placeholder="Enter 10-digit registration number"
                />
                {errors.registrationNumber && (
                  <p className="text-red-500 text-sm mt-1">{errors.registrationNumber.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  {...register('fullName', { required: 'Full name is required' })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 bg-white text-gray-900 placeholder-gray-500 font-medium"
                  placeholder="Enter your full name"
                />
                {errors.fullName && (
                  <p className="text-red-500 text-sm mt-1">{errors.fullName.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  {...register('email', { 
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    }
                  })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 bg-white text-gray-900 placeholder-gray-500 font-medium"
                  placeholder="Enter your email address"
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="mobileNumber" className="block text-sm font-medium text-gray-700 mb-2">
                  Mobile Number *
                </label>
                <input
                  {...register('mobileNumber', { required: 'Mobile number is required' })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 bg-white text-gray-900 placeholder-gray-500 font-medium"
                  placeholder="Enter your mobile number"
                />
                {errors.mobileNumber && (
                  <p className="text-red-500 text-sm mt-1">{errors.mobileNumber.message}</p>
                )}
              </div>

              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-md hover:shadow-lg"
                >
                  {submitting ? 'Registering...' : 'Register Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}