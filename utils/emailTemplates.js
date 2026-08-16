exports.otpEmailTemplate = ({ otp, title = "Verify your email", message = "Use the code below to complete your request. This code expires in 10 minutes." }) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    </head>
    <body style="margin:0; padding:0; background-color:#f4f4f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7; padding: 40px 0;">
        <tr>
          <td align="center">
            <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">

              <!-- Header / Brand -->
              <tr>
                <td style="background: linear-gradient(90deg, #6366f1, #8b5cf6); padding: 28px 32px;">
                  <span style="font-size:20px; font-weight:700; color:#ffffff; letter-spacing:0.3px;">Pro CV Builder</span>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding: 40px 32px 24px;">
                  <h1 style="margin:0 0 12px; font-size:22px; color:#1f2937;">${title}</h1>
                  <p style="margin:0 0 28px; font-size:15px; line-height:1.6; color:#6b7280;">${message}</p>

                  <div style="text-align:center; margin: 0 0 28px;">
                    <div style="display:inline-block; background-color:#f4f4f7; border-radius:12px; padding:18px 32px;">
                      <span style="font-size:32px; font-weight:700; letter-spacing:8px; color:#4f46e5;">${otp}</span>
                    </div>
                  </div>

                  <p style="margin:0; font-size:13px; line-height:1.6; color:#9ca3af;">
                    If you didn't request this, you can safely ignore this email. Never share this code with anyone — our team will never ask you for it.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 20px 32px; background-color:#f9fafb; border-top:1px solid #eef0f3;">
                  <p style="margin:0; font-size:12px; color:#9ca3af; text-align:center;">
                    &copy; ${new Date().getFullYear()} Pro CV Builder. All rights reserved.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};