# Event Management & Attendance Tracking System

A comprehensive event management system built with Next.js and Firebase, featuring QR-based check-ins, automated certificate generation, and role-based access control.

## Features

### 🎯 Core Features
- **Event Management**: Create and manage events with detailed information
- **User Authentication**: Firebase-based authentication with role-based access (Admin/Attendee)
- **Event Registration**: Simple registration process with unique QR code generation
- **QR-Based Check-in**: Real-time attendance tracking using QR code scanning
- **Automated Certificates**: PDF certificate generation and email delivery
- **Admin Dashboard**: Comprehensive management interface
- **Data Export**: CSV export functionality for attendee data

### 👥 User Roles

#### Attendee Features:
- Browse and view event details
- Register for events with contact information
- Receive unique QR codes for each registration
- Download QR codes for event check-in
- Receive automated certificates via email

#### Admin Features:
- Create and manage events
- Real-time QR code scanning for check-ins
- View attendee lists and export data to CSV
- Generate and send certificates to participants
- Comprehensive dashboard with analytics

## Tech Stack

- **Frontend**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS
- **Database**: Firebase Firestore
- **Authentication**: Firebase Authentication
- **Storage**: Firebase Storage
- **QR Codes**: qrcode & html5-qrcode libraries
- **PDF Generation**: jsPDF
- **Email**: Nodemailer
- **CSV Export**: csv-writer

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Firebase project set up
- Gmail account for email functionality (or other SMTP service)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd event-management-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Firebase Setup**
   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable the following services:
     - Authentication (Email/Password)
     - Firestore Database
     - Storage
   - Get your Firebase configuration

4. **Environment Configuration**
   - Copy `.env.example` to `.env.local`
   - Fill in your Firebase configuration:
     ```env
     NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
     NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
     NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
     NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
     NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
     NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
     
     # Email configuration
     EMAIL_USER=your_email@gmail.com
     EMAIL_PASS=your_app_password
     ADMIN_EMAIL=admin@yourdomain.com
     ```

5. **Firebase Security Rules**

   **Firestore Rules** (`firestore.rules`):
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Users can read/write their own data
       match /users/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
       
       // Events are readable by all, writable by admins
       match /events/{eventId} {
         allow read: if request.auth != null;
         allow write: if request.auth != null && 
           get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
       }
       
       // Registrations are readable by admins and the registrant
       match /registrations/{registrationId} {
         allow read: if request.auth != null && 
           (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' ||
            resource.data.userId == request.auth.uid);
         allow write: if request.auth != null;
       }
       
       // Certificates are readable by admins and the certificate holder
       match /certificates/{certificateId} {
         allow read: if request.auth != null && 
           (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' ||
            resource.data.userId == request.auth.uid);
         allow write: if request.auth != null && 
           get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
       }
     }
   }
   ```

   **Storage Rules** (`storage.rules`):
   ```javascript
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /events/{allPaths=**} {
         allow read: if request.auth != null;
         allow write: if request.auth != null && 
           firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data.role == 'admin';
       }
       
       match /certificates/{allPaths=**} {
         allow read: if request.auth != null;
         allow write: if request.auth != null && 
           firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data.role == 'admin';
       }
     }
   }
   ```

6. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### For Event Organizers (Admins)

1. **Sign up** with role "Event Organizer/Admin"
2. **Create events** from the admin dashboard
3. **Share event links** with potential attendees
4. **Use QR scanner** during events for check-ins
5. **Generate certificates** after event completion
6. **Export attendee data** as needed

### For Attendees

1. **Browse events** on the homepage
2. **Register for events** with contact details
3. **Download QR codes** after registration
4. **Present QR code** at event for check-in
5. **Receive certificates** via email after event completion

## Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── admin/             # Admin-only pages
│   ├── auth/              # Authentication pages
│   ├── events/            # Event-related pages
│   └── layout.tsx         # Root layout
├── components/            # Reusable components
├── contexts/              # React contexts (Auth)
├── lib/                   # Utility functions and configurations
│   ├── firebase.ts        # Firebase configuration
│   └── certificates.ts    # Certificate generation logic
└── types/                 # TypeScript type definitions
```

## Firebase Collections

### Users
```typescript
{
  id: string,
  email: string,
  displayName: string,
  role: 'admin' | 'attendee',
  createdAt: Date
}
```

### Events
```typescript
{
  id: string,
  title: string,
  description: string,
  date: Date,
  time: string,
  location: string,
  duration: string,
  capacity: number,
  imageUrl?: string,
  status: 'upcoming' | 'ongoing' | 'completed',
  createdBy: string,
  createdAt: Date
}
```

### Registrations
```typescript
{
  id: string,
  eventId: string,
  userId: string,
  registrationNumber: string,
  fullName: string,
  email: string,
  phoneNumber: string,
  mobileNumber: string,
  qrCode: string,
  checkedIn: boolean,
  checkedInAt?: Date,
  registeredAt: Date
}
```

### Certificates
```typescript
{
  id: string,
  eventId: string,
  userId: string,
  registrationId: string,
  certificateUrl: string,
  emailSent: boolean,
  generatedAt: Date
}
```

## Email Configuration

For Gmail:
1. Enable 2-factor authentication
2. Generate an app-specific password
3. Use the app password in `EMAIL_PASS`

For other email providers, modify the transporter configuration in `src/lib/certificates.ts`.

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically

### Other Platforms

The app can be deployed to any platform that supports Next.js applications.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License. See LICENSE for details.

## Support

For questions or issues, please create a GitHub issue or contact the development team.

---

Built with ❤️ using Next.js and Firebase