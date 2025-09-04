//backend/src/services/emailService.ts
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export interface EmailData {
  to: string;
  candidateName: string;
  interviewTitle: string;
  interviewLink: string;
  expiresAt: string;
  recruiterName?: string;
}

export class EmailService {
  static async sendInterviewInvitation(emailData: EmailData): Promise<boolean> {
    try {
      const expiryDate = new Date(emailData.expiresAt).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const emailContent = {
        to: emailData.to,
        from: {
          email: process.env.FROM_EMAIL!,
          name: process.env.FROM_NAME!
        },
        subject: `Video Interview Invitation - ${emailData.interviewTitle}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Video Interview Invitation</title>
          </head>
          <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 300;">Video Interview Invitation</h1>
            </div>
            
            <div style="background: #ffffff; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <p style="font-size: 18px; margin-bottom: 20px;">Hi <strong>${emailData.candidateName}</strong>,</p>
              
              <p style="margin-bottom: 20px;">You've been invited to complete a video interview for the <strong>${emailData.interviewTitle}</strong> position.</p>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #667eea;">
                <h3 style="margin: 0 0 15px 0; color: #667eea;">Interview Details</h3>
                <ul style="margin: 0; padding-left: 20px;">
                  <li style="margin-bottom: 8px;"><strong>Position:</strong> ${emailData.interviewTitle}</li>
                  <li style="margin-bottom: 8px;"><strong>Format:</strong> Video interview with recorded responses</li>
                  <li style="margin-bottom: 8px;"><strong>Expires:</strong> ${expiryDate}</li>
                </ul>
              </div>
              
              <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 25px 0;">
                <h3 style="margin: 0 0 15px 0; color: #1976d2;">Before You Begin</h3>
                <ul style="margin: 0; padding-left: 20px; color: #1565c0;">
                  <li style="margin-bottom: 8px;">Ensure you have a stable internet connection</li>
                  <li style="margin-bottom: 8px;">Find a quiet, well-lit space</li>
                  <li style="margin-bottom: 8px;">Allow camera and microphone access when prompted</li>
                  <li style="margin-bottom: 8px;">You can only record each answer once, so prepare thoughtfully</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${emailData.interviewLink}" 
                   style="display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; box-shadow: 0 3px 6px rgba(102, 126, 234, 0.3);">
                  Start Your Interview
                </a>
              </div>
              
              <div style="border-top: 1px solid #e0e0e0; padding-top: 20px; margin-top: 30px; font-size: 14px; color: #666;">
                <p style="margin: 0 0 10px 0;"><strong>Need help?</strong> Contact us if you experience any technical difficulties.</p>
                <p style="margin: 0; font-size: 12px; color: #999;">This interview link expires on ${expiryDate}. Please complete your interview before this date.</p>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
              <p>Best regards,<br>${emailData.recruiterName || process.env.FROM_NAME}</p>
            </div>
            
          </body>
          </html>
        `,
        text: `
Hi ${emailData.candidateName},

You've been invited to complete a video interview for the ${emailData.interviewTitle} position.

Interview Details:
- Position: ${emailData.interviewTitle}
- Format: Video interview with recorded responses
- Expires: ${expiryDate}

Before you begin:
- Ensure you have a stable internet connection
- Find a quiet, well-lit space
- Allow camera and microphone access when prompted
- You can only record each answer once, so prepare thoughtfully

Start your interview: ${emailData.interviewLink}

This interview link expires on ${expiryDate}.

Best regards,
${emailData.recruiterName || process.env.FROM_NAME}
        `
      };

      await sgMail.send(emailContent);
      console.log('Interview invitation email sent successfully to:', emailData.to);
      return true;

    } catch (error) {
      console.error('Failed to send interview invitation email:', error);
      return false;
    }
  }
}