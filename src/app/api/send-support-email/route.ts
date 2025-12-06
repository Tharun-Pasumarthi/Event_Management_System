import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const { name, email, subject, message } = await request.json();

    console.log('=== SUPPORT EMAIL REQUEST ===');
    console.log('From:', name, email);
    console.log('Subject:', subject);

    // Save to Firestore
    const supportRef = await addDoc(collection(db, 'supportMessages'), {
      name,
      email,
      subject,
      message,
      status: 'new',
      createdAt: serverTimestamp(),
    });

    console.log('Support message saved to Firestore:', supportRef.id);

    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Email to admin
    const adminMailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Admin receives the support request
      replyTo: email, // User's email for easy reply
      subject: `Support Request: ${subject}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f9f9f9;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 8px 8px 0 0;
            }
            .content {
              background: white;
              padding: 30px;
              border-radius: 0 0 8px 8px;
            }
            .info-row {
              margin: 15px 0;
              padding: 10px;
              background-color: #f5f5f5;
              border-radius: 4px;
            }
            .label {
              font-weight: bold;
              color: #667eea;
            }
            .message-box {
              background-color: #f9f9f9;
              border-left: 4px solid #667eea;
              padding: 15px;
              margin: 20px 0;
              white-space: pre-wrap;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🆘 New Support Request</h1>
            </div>
            <div class="content">
              <div class="info-row">
                <span class="label">From:</span> ${name}
              </div>
              <div class="info-row">
                <span class="label">Email:</span> ${email}
              </div>
              <div class="info-row">
                <span class="label">Subject:</span> ${subject}
              </div>
              <div class="message-box">
                <div class="label">Message:</div>
                <div style="margin-top: 10px;">${message}</div>
              </div>
              <p style="color: #666; font-size: 12px; margin-top: 30px;">
                Reply directly to this email to respond to ${name}.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    // Confirmation email to user
    const userMailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'We received your support request',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f9f9f9;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 8px 8px 0 0;
            }
            .content {
              background: white;
              padding: 30px;
              border-radius: 0 0 8px 8px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Support Request Received</h1>
            </div>
            <div class="content">
              <p>Hi ${name},</p>
              <p>Thank you for contacting our support team. We have received your request and will get back to you as soon as possible.</p>
              <p><strong>Your request:</strong></p>
              <p style="background-color: #f5f5f5; padding: 15px; border-radius: 4px;">
                <strong>Subject:</strong> ${subject}<br><br>
                <strong>Message:</strong><br>
                ${message}
              </p>
              <p>Our team typically responds within 24-48 hours. If your issue is urgent, please mark it as such in your message.</p>
              <p>Best regards,<br>Event Management Support Team</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    // Send both emails
    await transporter.sendMail(adminMailOptions);
    await transporter.sendMail(userMailOptions);

    console.log('Support emails sent successfully');

    return NextResponse.json({ 
      success: true,
      message: 'Support request sent successfully' 
    });
  } catch (error) {
    console.error('Error sending support email:', error);
    return NextResponse.json(
      { error: 'Failed to send support request' },
      { status: 500 }
    );
  }
}
