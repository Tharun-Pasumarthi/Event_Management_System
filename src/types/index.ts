export interface User {
  id: string;
  email: string;
  displayName: string;
  role: 'admin' | 'attendee';
  createdAt: Date;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: Date;
  time: string;
  location: string;
  duration: string;
  capacity: number;
  imageUrl?: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  createdBy: string;
  createdAt: Date;
}

export interface Registration {
  id: string;
  eventId: string;
  eventTitle: string;
  userId: string;
  registrationNumber: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  qrCode: string;
  checkedIn: boolean;
  checkedInAt?: Date;
  registeredAt: Date;
}

export interface Certificate {
  id: string;
  eventId: string;
  userId: string;
  registrationId: string;
  certificateUrl: string;
  emailSent: boolean;
  generatedAt: Date;
}

export interface SupportMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'new' | 'in-progress' | 'resolved';
  createdAt: Date;
  resolvedAt?: Date;
  adminNotes?: string;
}

export interface SupportMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'new' | 'in-progress' | 'resolved';
  response?: string;
  createdAt: Date;
  resolvedAt?: Date;
}