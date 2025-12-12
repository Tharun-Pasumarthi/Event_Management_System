import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const { registrationNumber } = await request.json();

    // Validate format
    const pattern = /^[A-Z0-9]{10}$/;
    if (!pattern.test(registrationNumber)) {
      return NextResponse.json(
        { 
          valid: false, 
          error: 'Registration number must be exactly 10 alphanumeric characters (A-Z, 0-9)' 
        },
        { status: 400 }
      );
    }

    // Check if registration number already exists
    const registrationsRef = collection(db, 'registrations');
    const q = query(registrationsRef, where('registrationNumber', '==', registrationNumber));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      return NextResponse.json(
        { 
          valid: false, 
          error: 'Registration number already exists. Please use a different number.' 
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error('Error validating registration number:', error);
    return NextResponse.json(
      { valid: false, error: 'Server error during validation' },
      { status: 500 }
    );
  }
}
