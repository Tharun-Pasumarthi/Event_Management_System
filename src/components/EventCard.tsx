'use client';

import { useState } from 'react';
import { Event } from '@/types';
import { format } from 'date-fns';
import { 
  CalendarIcon, 
  ClockIcon, 
  MapPinIcon, 
  UsersIcon,
  EyeIcon 
} from '@heroicons/react/24/outline';
import Link from 'next/link';

interface EventCardProps {
  event: Event;
}

export default function EventCard({ event }: EventCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      {event.imageUrl && (
        <img
          src={event.imageUrl}
          alt={event.title}
          className="w-full h-48 object-cover"
        />
      )}
      
      <div className="p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {event.title}
        </h3>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-gray-600">
            <CalendarIcon className="h-4 w-4 mr-2" />
            <span className="text-sm">
              {format(event.date, 'PPP')}
            </span>
          </div>
          
          <div className="flex items-center text-gray-600">
            <ClockIcon className="h-4 w-4 mr-2" />
            <span className="text-sm">{event.time} ({event.duration})</span>
          </div>
          
          <div className="flex items-center text-gray-600">
            <MapPinIcon className="h-4 w-4 mr-2" />
            <span className="text-sm">{event.location}</span>
          </div>
          
          <div className="flex items-center text-gray-600">
            <UsersIcon className="h-4 w-4 mr-2" />
            <span className="text-sm">Capacity: {event.capacity}</span>
          </div>
        </div>

        <p className="text-gray-600 mb-4 line-clamp-2">
          {showDetails ? event.description : `${event.description.substring(0, 100)}...`}
        </p>

        <div className="flex gap-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center space-x-1 text-primary-600 hover:text-primary-700"
          >
            <EyeIcon className="h-4 w-4" />
            <span className="text-sm">
              {showDetails ? 'Show Less' : 'View Details'}
            </span>
          </button>
          
          <Link
            href={`/events/${event.id}/register`}
            className="btn-primary text-sm ml-auto"
          >
            Register Now
          </Link>
        </div>

        {showDetails && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="font-semibold mb-2">Full Description:</h4>
            <p className="text-gray-600 text-sm">{event.description}</p>
            <div className="mt-3">
              <span className="inline-block bg-primary-100 text-primary-800 text-xs px-2 py-1 rounded-full">
                Status: {event.status}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}