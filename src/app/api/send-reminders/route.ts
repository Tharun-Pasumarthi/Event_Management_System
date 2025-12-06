import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const { registrations, event } = await request.json();

    console.log('=== SEND REMINDERS DEBUG ===');
    console.log('Registrations count:', registrations?.length);
    console.log('Event:', event?.title);
    console.log('Email config:', {
      user: process.env.EMAIL_USER,
      hasPassword: !!process.env.EMAIL_PASS
    });

    if (!registrations || registrations.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No registrations provided' },
        { status: 400 }
      );
    }

    if (!event) {
      return NextResponse.json(
        { success: false, error: 'No event provided' },
        { status: 400 }
      );
    }

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('Email credentials not configured');
      return NextResponse.json(
        { success: false, error: 'Email service not configured' },
        { status: 500 }
      );
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const eventDate = new Date(event.date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let successCount = 0;
    let errorCount = 0;

    // Send reminder to each registered attendee
    for (const registration of registrations) {
      try {
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #f59e0b 0%, #fb923c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
              .event-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
              .reminder-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
              .info-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
              .label { font-weight: bold; color: #f59e0b; }
              .cta-button { display: inline-block; background: #f59e0b; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>⏰ Event Reminder</h1>
                <p>Don't forget about your upcoming event!</p>
              </div>
              
              <div class="content">
                <h2>Hi ${registration.fullName},</h2>
                <p>This is a friendly reminder about the event you registered for.</p>
                
                <div class="event-details">
                  <h3 style="color: #f59e0b; margin-top: 0;">📅 Event Details</h3>
                  <div class="info-row">
                    <span class="label">Event:</span>
                    <span><strong>${event.title}</strong></span>
                  </div>
                  <div class="info-row">
                    <span class="label">Date:</span>
                    <span>${eventDate}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">Time:</span>
                    <span>${event.time}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">Location:</span>
                    <span>${event.location}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">Duration:</span>
                    <span>${event.duration}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">Your Registration #:</span>
                    <span><strong>${registration.registrationNumber}</strong></span>
                  </div>
                </div>

                <div class="reminder-box">
                  <h3 style="color: #856404; margin-top: 0;">⚠️ Important Reminders</h3>
                  <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>Please arrive 15 minutes before the event starts</li>
                    <li>Have your QR code ready for quick check-in</li>
                    <li>Carry a valid photo ID</li>
                    <li>Follow any specific instructions for the venue</li>
                  </ul>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                  <p style="font-size: 18px; font-weight: bold; color: #f59e0b;">
                    📱 Don't Forget Your QR Code!
                  </p>
                  <p style="color: #666;">
                    Please have your registration QR code ready on your phone or printed.
                  </p>
                </div>

                <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; color: #1e40af;">
                    <strong>📞 Need Help?</strong> If you have any questions or need to update your registration,
                    please contact us as soon as possible.
                  </p>
                </div>
              </div>

              <div class="footer">
                <p>We look forward to seeing you at the event! 🎉</p>
                <p style="color: #999; font-size: 12px;">
                  This is an automated reminder. Please do not reply to this message.
                </p>
              </div>
            </div>
          </body>
          </html>
        `;

        await transporter.sendMail({
          from: `"Event Management System" <${process.env.EMAIL_USER}>`,
          to: registration.email,
          subject: `Reminder: ${event.title} - ${eventDate}`,
          html: htmlContent,
        });

        successCount++;
        console.log(`✓ Reminder sent to ${registration.email}`);
      } catch (error: any) {
        console.error(`✗ Failed to send reminder to ${registration.email}:`, error.message);
        errorCount++;
      }
    }

    console.log(`=== REMINDERS COMPLETE: ${successCount} sent, ${errorCount} failed ===`);

    return NextResponse.json({
      success: true,
      message: `Sent ${successCount} reminders. ${errorCount} failed.`,
      successCount,
      errorCount
    });
  } catch (error: any) {
    console.error('=== REMINDER SENDING ERROR ===');
    console.error('Error:', error);
    console.error('Message:', error.message);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send reminders' },
      { status: 500 }
    );
  }
}
