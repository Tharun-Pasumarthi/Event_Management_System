'use client';

import Link from 'next/link';
import { CalendarIcon, QrCodeIcon, DocumentIcon } from '@heroicons/react/24/outline';

export default function Hero() {
  return (
    <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Event Management
            <br />
            <span className="text-primary-200">Made Simple</span>
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-primary-100">
            QR-based check-ins, automated certificates, and seamless event management
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link href="/events" className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
              View Events
            </Link>
            <Link href="/auth/signup" className="border-2 border-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-primary-600 transition-colors">
              Get Started
            </Link>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="text-center">
              <QrCodeIcon className="h-12 w-12 mx-auto mb-4 text-primary-200" />
              <h3 className="text-xl font-semibold mb-2">QR Code Check-ins</h3>
              <p className="text-primary-100">
                Fast and secure attendance tracking with unique QR codes
              </p>
            </div>
            <div className="text-center">
              <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-primary-200" />
              <h3 className="text-xl font-semibold mb-2">Event Scheduling</h3>
              <p className="text-primary-100">
                Easy event creation and management with admin dashboard
              </p>
            </div>
            <div className="text-center">
              <DocumentIcon className="h-12 w-12 mx-auto mb-4 text-primary-200" />
              <h3 className="text-xl font-semibold mb-2">Auto Certificates</h3>
              <p className="text-primary-100">
                Automated certificate generation and email delivery
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}