import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const { toEmail, toName, subject, status, adminNotes } = await request.json();

    console.log('=== SUPPORT STATUS UPDATE EMAIL ===');
    console.log('To:', toName, toEmail);
    console.log('Status:', status);

    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const statusMessages = {
      'in-progress': {
        title: '🔄 Your Support Request is Being Reviewed',
        message: 'Our team is currently working on your request. We will update you once it is resolved.',
        color: '#f59e0b',
      },
      'resolved': {
        title: '✅ Your Support Request Has Been Resolved',
        message: 'Your support request has been successfully resolved. If you have any further questions, feel free to reach out.',
        color: '#10b981',
      },
      'new': {
        title: '📩 Your Support Request Status',
        message: 'Your support request status has been updated.',
        color: '#3b82f6',
      },
    };

    const statusInfo = statusMessages[status as keyof typeof statusMessages] || statusMessages.new;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: toEmail,
      subject: `Support Update: ${subject}`,
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
              background: linear-gradient(135deg, ${statusInfo.color} 0%, ${statusInfo.color}dd 100%);
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
            .status-badge {
              display: inline-block;
              padding: 8px 16px;
              background-color: ${statusInfo.color}22;
              color: ${statusInfo.color};
              border-radius: 20px;
              font-weight: bold;
              margin: 10px 0;
            }
            .notes-box {
              background-color: #f5f5f5;
              border-left: 4px solid ${statusInfo.color};
              padding: 15px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${statusInfo.title}</h1>
            </div>
            <div class="content">
              <p>Hi ${toName},</p>
              <p>${statusInfo.message}</p>
              
              <p><strong>Your Request:</strong> ${subject}</p>
              
              <div class="status-badge">
                Status: ${status.toUpperCase().replace('-', ' ')}
              </div>
              
              ${adminNotes ? `
                <div class="notes-box">
                  <strong>Admin Notes:</strong>
                  <div style="margin-top: 10px; white-space: pre-wrap;">${adminNotes}</div>
                </div>
              ` : ''}
              
              <p style="margin-top: 30px;">If you have any additional questions or concerns, please don't hesitate to reply to this email or submit a new support request.</p>
              
              <p>Best regards,<br>Event Management Support Team</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);

    console.log('Support status update email sent successfully');

    return NextResponse.json({ 
      success: true,
      message: 'Status update email sent successfully' 
    });
  } catch (error) {
    console.error('Error sending support status update email:', error);
    return NextResponse.json(
      { error: 'Failed to send status update email' },
      { status: 500 }
    );
  }
}
