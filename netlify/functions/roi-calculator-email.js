// Netlify Function to send ROI Calculator emails via Elastic Email
// Triggered by Netlify Forms submission webhook

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const payload = JSON.parse(event.body);

    // Check if this is from the roi-calculator form
    if (payload.form_name !== 'roi-calculator') {
      return { statusCode: 200, body: 'Not ROI calculator form, skipping' };
    }

    const data = payload.data || payload;

    // Extract form data
    const {
      name,
      email,
      phone,
      industry,
      'monthly-goal': monthlyGoal,
      'avg-job-size': avgJobSize,
      'closing-rate': closingRate,
      'monthly-jobs': monthlyJobs,
      'monthly-estimates': monthlyEstimates,
      'monthly-leads': monthlyLeads,
      'weekly-jobs': weeklyJobs,
      'weekly-estimates': weeklyEstimates,
      'weekly-leads': weeklyLeads,
      'yearly-jobs': yearlyJobs,
      'yearly-estimates': yearlyEstimates,
      'yearly-leads': yearlyLeads,
    } = data;

    // Elastic Email API key from environment variable
    const apiKey = process.env.ELASTIC_EMAIL_API_KEY;

    if (!apiKey) {
      console.error('ELASTIC_EMAIL_API_KEY not set');
      return { statusCode: 500, body: 'Email configuration error' };
    }

    // Email 1: To the Contractor
    const contractorEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your ROI Calculator Results</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #069c4b; padding: 30px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800;">Your ROI Calculator Results</h1>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #374151; font-size: 18px; line-height: 1.6; margin: 0 0 20px 0;">
                Hey ${name.split(' ')[0]},
              </p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Here's what it takes to hit your <strong style="color: #069c4b;">$${monthlyGoal}/month</strong> revenue goal:
              </p>

              <!-- Results Grid -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td width="33%" style="padding: 10px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 8px; padding: 20px; text-align: center;">
                      <tr><td style="color: #6b7280; font-size: 14px; padding-bottom: 10px;">WEEKLY</td></tr>
                      <tr><td style="color: #069c4b; font-size: 24px; font-weight: 800;">${weeklyLeads}</td></tr>
                      <tr><td style="color: #374151; font-size: 12px;">leads needed</td></tr>
                    </table>
                  </td>
                  <td width="33%" style="padding: 10px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #069c4b; border-radius: 8px; padding: 20px; text-align: center;">
                      <tr><td style="color: #ffffff; font-size: 14px; padding-bottom: 10px;">MONTHLY</td></tr>
                      <tr><td style="color: #ffffff; font-size: 24px; font-weight: 800;">${monthlyLeads}</td></tr>
                      <tr><td style="color: #d1fae5; font-size: 12px;">leads needed</td></tr>
                    </table>
                  </td>
                  <td width="33%" style="padding: 10px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 8px; padding: 20px; text-align: center;">
                      <tr><td style="color: #6b7280; font-size: 14px; padding-bottom: 10px;">YEARLY</td></tr>
                      <tr><td style="color: #069c4b; font-size: 24px; font-weight: 800;">${yearlyLeads}</td></tr>
                      <tr><td style="color: #374151; font-size: 12px;">leads needed</td></tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Full Breakdown -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>Your Inputs</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;"></td>
                </tr>
                <tr>
                  <td style="padding: 10px; color: #6b7280;">Monthly Goal</td>
                  <td style="padding: 10px; text-align: right; color: #374151;">$${monthlyGoal}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; color: #6b7280;">Average Job Size</td>
                  <td style="padding: 10px; text-align: right; color: #374151;">$${avgJobSize}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; color: #6b7280;">Closing Rate</td>
                  <td style="padding: 10px; text-align: right; color: #374151;">${closingRate}%</td>
                </tr>
                <tr>
                  <td style="padding: 10px; color: #6b7280;">Industry</td>
                  <td style="padding: 10px; text-align: right; color: #374151;">${industry}</td>
                </tr>
              </table>

              <!-- The Challenge Section -->
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 0 8px 8px 0; margin-bottom: 30px;">
                <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px;">The Real Challenge</h3>
                <p style="color: #78350f; margin: 0; font-size: 14px; line-height: 1.6;">
                  Most contractors overestimate how many leads they need. The real challenge isn't volume—it's <strong>consistency</strong>. That's where a complete marketing system comes in.
                </p>
              </div>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="https://therebelape.com/schedule/" style="display: inline-block; background-color: #facc15; color: #1f2937; font-weight: 700; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-size: 16px;">
                      Let's Talk About Building Your Lead System
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; text-align: center;">
                Questions? Just reply to this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #18181b; padding: 30px 40px; text-align: center;">
              <p style="color: #a1a1aa; font-size: 14px; margin: 0 0 10px 0;">
                Rebel Ape Marketing
              </p>
              <p style="color: #71717a; font-size: 12px; margin: 0;">
                Marketing that actually works for contractors.
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

    // Email 2: Lead notification to Adam
    const leadNotificationHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New ROI Calculator Lead</title>
</head>
<body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5;">
  <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
    <tr>
      <td style="background-color: #069c4b; padding: 20px; color: #ffffff;">
        <h2 style="margin: 0;">New ROI Calculator Lead</h2>
        <p style="margin: 5px 0 0 0; opacity: 0.9;">${name} - ${industry}</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px;">
        <h3 style="margin: 0 0 15px 0; color: #374151;">Contact Info</h3>
        <table width="100%" style="margin-bottom: 25px;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; width: 120px;">Name:</td>
            <td style="padding: 8px 0; color: #111827; font-weight: 600;">${name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Email:</td>
            <td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #069c4b;">${email}</a></td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Phone:</td>
            <td style="padding: 8px 0;"><a href="tel:${phone}" style="color: #069c4b;">${phone}</a></td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Industry:</td>
            <td style="padding: 8px 0; color: #111827;">${industry}</td>
          </tr>
        </table>

        <h3 style="margin: 0 0 15px 0; color: #374151;">Calculator Inputs</h3>
        <table width="100%" style="margin-bottom: 25px; background-color: #f8fafc; border-radius: 8px;">
          <tr>
            <td style="padding: 12px; color: #6b7280;">Monthly Goal:</td>
            <td style="padding: 12px; color: #111827; font-weight: 600;">$${monthlyGoal}</td>
          </tr>
          <tr>
            <td style="padding: 12px; color: #6b7280;">Avg Job Size:</td>
            <td style="padding: 12px; color: #111827;">$${avgJobSize}</td>
          </tr>
          <tr>
            <td style="padding: 12px; color: #6b7280;">Closing Rate:</td>
            <td style="padding: 12px; color: #111827;">${closingRate}%</td>
          </tr>
        </table>

        <h3 style="margin: 0 0 15px 0; color: #374151;">Calculated Results</h3>
        <table width="100%" style="background-color: #ecfdf5; border-radius: 8px;">
          <tr>
            <td style="padding: 12px; font-weight: 600; color: #065f46;">Weekly</td>
            <td style="padding: 12px; color: #065f46;">${weeklyJobs} jobs | ${weeklyEstimates} estimates | ${weeklyLeads} leads</td>
          </tr>
          <tr>
            <td style="padding: 12px; font-weight: 600; color: #065f46;">Monthly</td>
            <td style="padding: 12px; color: #065f46;">${monthlyJobs} jobs | ${monthlyEstimates} estimates | ${monthlyLeads} leads</td>
          </tr>
          <tr>
            <td style="padding: 12px; font-weight: 600; color: #065f46;">Yearly</td>
            <td style="padding: 12px; color: #065f46;">${yearlyJobs} jobs | ${yearlyEstimates} estimates | ${yearlyLeads} leads</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // Send emails via Elastic Email API
    const elasticEmailUrl = 'https://api.elasticemail.com/v2/email/send';

    // Send to contractor
    const contractorEmailParams = new URLSearchParams({
      apikey: apiKey,
      from: 'adam@therebelape.com',
      fromName: 'Adam at Rebel Ape',
      to: email,
      subject: `Here's What It Takes to Hit Your $${monthlyGoal}/month Goal`,
      bodyHtml: contractorEmailHtml,
      isTransactional: 'true'
    });

    const contractorResponse = await fetch(elasticEmailUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: contractorEmailParams.toString()
    });

    const contractorResult = await contractorResponse.json();
    console.log('Contractor email result:', contractorResult);

    // Send lead notification to Adam
    const leadEmailParams = new URLSearchParams({
      apikey: apiKey,
      from: 'notifications@therebelape.com',
      fromName: 'ROI Calculator',
      to: 'adam@therebelape.com',
      subject: `New ROI Calculator Lead - ${name} - ${industry}`,
      bodyHtml: leadNotificationHtml,
      isTransactional: 'true'
    });

    const leadResponse = await fetch(elasticEmailUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: leadEmailParams.toString()
    });

    const leadResult = await leadResponse.json();
    console.log('Lead notification result:', leadResult);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        contractorEmail: contractorResult,
        leadNotification: leadResult
      })
    };

  } catch (error) {
    console.error('Error sending emails:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
