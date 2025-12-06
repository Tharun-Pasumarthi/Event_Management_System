import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const { toEmail, toName, subject, originalMessage, response } = await request.json();

    console.log('=== SUPPORT RESPONSE EMAIL ===');
    console.log('To:', toName, toEmail);

    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: toEmail,
      subject: `Re: ${subject}`,
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
            .original {
              background-color: #f5f5f5;
              border-left: 4px solid #ccc;
              padding: 15px;
              margin: 20px 0;
            }
            .response {
              background-color: #e8f4fd;
              border-left: 4px solid #667eea;
              padding: 15px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✉️ Support Team Response</h1>
            </div>
            <div class="content">
              <p>Hi ${toName},</p>
              <p>Thank you for contacting our support team. Here's our response to your inquiry:</p>
              
              <div class="response">
                <strong>Our Response:</strong>
                <div style="margin-top: 10px; white-space: pre-wrap;">${response}</div>
              </div>

              <div class="original">
                <strong>Your Original Message:</strong>
                <div style="margin-top: 10px; white-space: pre-wrap;">${originalMessage}</div>
              </div>

              <p>If you have any additional questions, please don't hesitate to reach out.</p>
              
              <p>Best regards,<br>Event Management Support Team</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);

    console.log('Support response email sent successfully');

    return NextResponse.json({ 
      success: true,
      message: 'Response sent successfully' 
    });
  } catch (error) {
    console.error('Error sending support response:', error);
    return NextResponse.json(
      { error: 'Failed to send response' },
      { status: 500 }
    );
  }
}
