import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const { to, subject, eventTitle, eventDate, eventTime, eventLocation, registrationNumber, attendeeName, qrCode } = await request.json();

    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Email HTML template
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .event-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1e40af; }
          .qr-section { text-align: center; background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .qr-code { max-width: 250px; margin: 20px auto; display: block; border: 3px solid #1e40af; padding: 10px; border-radius: 8px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .info-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .label { font-weight: bold; color: #1e40af; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Registration Confirmed!</h1>
            <p>You're all set for the event</p>
          </div>
          
          <div class="content">
            <h2>Hi ${attendeeName},</h2>
            <p>Thank you for registering! Your registration has been confirmed.</p>
            
            <div class="event-details">
              <h3 style="color: #1e40af; margin-top: 0;">📅 Event Details</h3>
              <div class="info-row">
                <span class="label">Event:</span>
                <span>${eventTitle}</span>
              </div>
              <div class="info-row">
                <span class="label">Date:</span>
                <span>${eventDate}</span>
              </div>
              <div class="info-row">
                <span class="label">Time:</span>
                <span>${eventTime}</span>
              </div>
              <div class="info-row">
                <span class="label">Location:</span>
                <span>${eventLocation}</span>
              </div>
              <div class="info-row">
                <span class="label">Registration #:</span>
                <span><strong>${registrationNumber}</strong></span>
              </div>
            </div>

            <div class="qr-section">
              <h3 style="color: #1e40af;">📱 Your QR Code</h3>
              <p>Please bring this QR code on the day of the event for quick check-in.</p>
              <img src="${qrCode}" alt="QR Code" class="qr-code" />
              <p style="font-size: 12px; color: #666;">
                You can also save this image to your phone for easy access.
              </p>
            </div>

            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #856404;">
                <strong>⚠️ Important:</strong> Please arrive 15 minutes before the event starts.
                Make sure to have your QR code ready for scanning at the entrance.
              </p>
            </div>
          </div>

          <div class="footer">
            <p>If you have any questions, please contact us.</p>
            <p style="color: #999; font-size: 12px;">
              This is an automated email. Please do not reply to this message.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email
    await transporter.sendMail({
      from: `"Event Management System" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject || `Registration Confirmed - ${eventTitle}`,
      html: htmlContent,
      attachments: [
        {
          filename: 'qr-code.png',
          content: qrCode.split('base64,')[1],
          encoding: 'base64',
          cid: 'qrcode'
        }
      ]
    });

    return NextResponse.json({ success: true, message: 'Email sent successfully' });
  } catch (error: any) {
    console.error('Email sending error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
