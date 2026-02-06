// Netlify Function to handle Website Audit lead submission
// Sends emails via Elastic Email and posts to Make webhook for GHL integration

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const data = JSON.parse(event.body);

    const {
      name,
      email,
      phone,
      website,
      score,
      grade,
      gradeMessage,
      topIssues,
      checks,
      scores,
      questionAnswers
    } = data;

    if (!name || !email) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Name and email are required' }) };
    }

    const firstName = name.split(' ')[0];

    // Build passed/failed check lists for email
    const passedChecks = [];
    const failedChecks = [];

    const checkLabels = {
      mobileResponsive: 'Mobile Responsive',
      pageSpeed: 'Page Speed',
      ssl: 'SSL Certificate',
      brokenLinks: 'Broken Links',
      phoneVisible: 'Phone Number Visible',
      clickToCall: 'Click-to-Call on Mobile',
      contactForm: 'Contact Form Present',
      clearCTAs: 'Clear Calls to Action',
      testimonials: 'Testimonials/Reviews',
      credentials: 'Credentials Visible'
    };

    for (const [key, label] of Object.entries(checkLabels)) {
      if (checks && checks[key]) {
        if (checks[key].passed) {
          passedChecks.push({ label, details: checks[key].details });
        } else {
          failedChecks.push({ label, details: checks[key].details, pointsLost: checks[key].maxScore - checks[key].score });
        }
      }
    }

    // Sort failed by points lost (biggest issues first)
    failedChecks.sort((a, b) => b.pointsLost - a.pointsLost);

    // Priority fixes for email
    const priorityFixes = failedChecks.slice(0, 3).map((check, i) => ({
      priority: i + 1,
      name: check.label,
      details: check.details,
      fix: getFixSuggestion(check.label)
    }));

    // Build bottom line based on score
    let bottomLine = '';
    if (score >= 80) {
      bottomLine = `Your site scored ${score}/100 — it's in solid shape. There are still a few optimizations that could improve your conversion rate, but the foundation is strong. If you want to squeeze more leads out of your existing traffic, that's where we come in.`;
    } else if (score >= 60) {
      bottomLine = `Your site scored ${score}/100 — it works, but it's leaving money on the table. The good news? Most of these fixes aren't massive overhauls. A few targeted improvements could significantly increase the number of visitors who actually pick up the phone or fill out your form.`;
    } else if (score >= 40) {
      bottomLine = `Your site scored ${score}/100 — and that's hurting your business more than you probably realize. Every day this site is live without fixes, you're losing potential customers to competitors with better-converting websites. The fixes aren't always complicated, but they need to happen.`;
    } else {
      bottomLine = `Your site scored ${score}/100 — let's be straight with you: this site is actively losing you jobs. If you're running ads to this, you're essentially burning money. The good news is there's nowhere to go but up, and the improvements that will have the biggest impact are often the most straightforward to implement.`;
    }

    // 1. Send email to the user
    const apiKey = process.env.ELASTIC_EMAIL_API_KEY;
    if (apiKey) {
      const userEmailHtml = buildUserEmail({ firstName, name, website, score, grade, gradeMessage, passedChecks, failedChecks, priorityFixes, bottomLine, questionAnswers });
      const leadEmailHtml = buildLeadNotificationEmail({ name, email, phone, website, score, grade, gradeMessage, topIssues, passedChecks, failedChecks, questionAnswers, scores });

      const elasticEmailUrl = 'https://api.elasticemail.com/v2/email/send';

      // Send to user
      const userEmailParams = new URLSearchParams({
        apikey: apiKey,
        from: 'adam@therebelape.com',
        fromName: 'Adam at Rebel Ape',
        to: email,
        subject: `Your Website Audit Results — ${score}/100`,
        bodyHtml: userEmailHtml,
        isTransactional: 'true'
      });

      const userResponse = await fetch(elasticEmailUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: userEmailParams.toString()
      });
      console.log('User email result:', await userResponse.json());

      // Send lead notification to Adam
      const leadEmailParams = new URLSearchParams({
        apikey: apiKey,
        from: 'notifications@therebelape.com',
        fromName: 'Website Audit Tool',
        to: 'adam@therebelape.com',
        subject: `New Website Audit Lead: ${name} — Score: ${score}/100`,
        bodyHtml: leadEmailHtml,
        isTransactional: 'true'
      });

      const leadResponse = await fetch(elasticEmailUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: leadEmailParams.toString()
      });
      console.log('Lead notification result:', await leadResponse.json());
    } else {
      console.warn('ELASTIC_EMAIL_API_KEY not set, skipping emails');
    }

    // 2. Send to Make webhook for GHL integration
    const makeWebhookUrl = process.env.MAKE_WEBHOOK_WEBSITE_AUDIT;
    if (makeWebhookUrl) {
      const webhookPayload = {
        firstName: firstName,
        lastName: name.split(' ').slice(1).join(' ') || '',
        email: email,
        phone: phone || '',
        website: website,
        auditScore: score,
        auditGrade: grade,
        auditGradeMessage: gradeMessage,
        topIssues: (topIssues || []).map(i => i.name).join(', '),
        runningAds: questionAnswers?.runningAds || 'Unknown',
        hasPhotos: questionAnswers?.brandedPhotos || 'Unknown',
        messagingQuality: questionAnswers?.messaging || 'Unknown',
        source: 'Website Audit Tool',
        tags: 'Website Audit,Resources Lead'
      };

      try {
        const webhookResponse = await fetch(makeWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookPayload)
        });
        console.log('Make webhook status:', webhookResponse.status);
      } catch (webhookError) {
        console.error('Make webhook error:', webhookError.message);
      }
    } else {
      console.warn('MAKE_WEBHOOK_WEBSITE_AUDIT not set, skipping GHL integration');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true })
    };

  } catch (error) {
    console.error('Submit error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

function getFixSuggestion(checkName) {
  const fixes = {
    'Mobile Responsive': 'Add a viewport meta tag and ensure your CSS uses responsive breakpoints. Most modern website builders handle this automatically — if yours doesn\'t, it\'s time to upgrade.',
    'Page Speed': 'Compress your images (use WebP format), minimize JavaScript, and consider a CDN. A slow site kills conversions — every second of load time costs you leads.',
    'SSL Certificate': 'Install an SSL certificate (most hosts offer free ones through Let\'s Encrypt). Without it, browsers show a "Not Secure" warning that scares away customers.',
    'Broken Links': 'Audit your links and fix or remove any that lead to 404 pages. Broken links hurt SEO and make your business look neglected.',
    'Phone Number Visible': 'Put your phone number in the header of every page. Make it large, visible, and impossible to miss. This is the #1 conversion driver for contractors.',
    'Click-to-Call on Mobile': 'Wrap your phone number in a tel: link so mobile visitors can tap to call. Over 60% of contractor site visits are on mobile.',
    'Contact Form Present': 'Add a simple contact form above the fold. Name, phone, email, and a brief description of the job. Don\'t ask for too much — every field reduces submissions.',
    'Clear Calls to Action': 'Add clear, action-oriented buttons: "Get Free Estimate," "Schedule Inspection," "Call Now." Avoid vague CTAs like "Learn More" or "Submit."',
    'Testimonials/Reviews': 'Add 3-5 real customer testimonials with names and locations. Better yet, embed your Google reviews. Social proof is one of the strongest conversion drivers.',
    'Credentials Visible': 'Display your licenses, certifications, insurance, BBB rating, and years in business prominently. Homeowners need to trust you before they call.'
  };
  return fixes[checkName] || 'Address this issue to improve your website\'s effectiveness.';
}

function buildUserEmail({ firstName, website, score, grade, gradeMessage, passedChecks, failedChecks, priorityFixes, bottomLine, questionAnswers }) {
  const passedHTML = passedChecks.map(c =>
    `<tr><td style="padding: 10px 15px; color: #065f46; border-bottom: 1px solid #ecfdf5;">&#10003; ${c.label}</td><td style="padding: 10px 15px; color: #6b7280; border-bottom: 1px solid #ecfdf5; font-size: 14px;">${c.details}</td></tr>`
  ).join('');

  const failedHTML = failedChecks.map(c =>
    `<tr><td style="padding: 10px 15px; color: #991b1b; border-bottom: 1px solid #fef2f2;">&#10007; ${c.label}</td><td style="padding: 10px 15px; color: #6b7280; border-bottom: 1px solid #fef2f2; font-size: 14px;">${c.details}</td></tr>`
  ).join('');

  const priorityHTML = priorityFixes.map(p => `
    <div style="background-color: #f8fafc; border-left: 4px solid #069c4b; padding: 16px 20px; margin-bottom: 16px; border-radius: 0 8px 8px 0;">
      <h4 style="margin: 0 0 8px 0; color: #111827; font-size: 16px;">Priority ${p.priority}: ${p.name}</h4>
      <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;"><strong>What we found:</strong> ${p.details}</p>
      <p style="margin: 0; color: #374151; font-size: 14px;"><strong>How to fix it:</strong> ${p.fix}</p>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <tr><td style="background-color: #069c4b; padding: 30px 40px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 800;">Your Website Audit Results</h1>
          <p style="color: #d1fae5; margin: 10px 0 0 0; font-size: 16px;">${website}</p>
        </td></tr>
        <tr><td style="padding: 40px;">
          <p style="color: #374151; font-size: 18px; line-height: 1.6; margin: 0 0 20px 0;">Hey ${firstName},</p>
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">Here's your full website audit breakdown.</p>

          <div style="text-align: center; padding: 24px; background: linear-gradient(135deg, #f8fafc, #ecfdf5); border-radius: 12px; margin-bottom: 30px;">
            <p style="font-size: 48px; font-weight: 900; color: #069c4b; margin: 0;">${score}/100</p>
            <p style="font-size: 14px; color: #6b7280; margin: 8px 0 0 0; font-weight: 600;">${gradeMessage}</p>
          </div>

          ${passedChecks.length > 0 ? `
          <h3 style="color: #065f46; margin: 0 0 12px 0; font-size: 18px;">What's Working</h3>
          <table width="100%" style="margin-bottom: 24px; background: #f0fdf4; border-radius: 8px; overflow: hidden;">
            ${passedHTML}
          </table>` : ''}

          ${failedChecks.length > 0 ? `
          <h3 style="color: #991b1b; margin: 0 0 12px 0; font-size: 18px;">What's Killing Your Conversions</h3>
          <table width="100%" style="margin-bottom: 24px; background: #fef2f2; border-radius: 8px; overflow: hidden;">
            ${failedHTML}
          </table>` : ''}

          ${priorityFixes.length > 0 ? `
          <h3 style="color: #111827; margin: 24px 0 16px 0; font-size: 20px; font-weight: 800;">WHAT TO FIX FIRST</h3>
          ${priorityHTML}` : ''}

          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 0 8px 8px 0; margin: 24px 0;">
            <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px;">The Bottom Line</h3>
            <p style="color: #78350f; margin: 0; font-size: 14px; line-height: 1.6;">${bottomLine}</p>
          </div>

          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding: 20px 0;">
              <a href="https://therebelape.com/schedule/" style="display: inline-block; background-color: #facc15; color: #1f2937; font-weight: 700; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-size: 16px;">Schedule a Free Strategy Call</a>
            </td></tr>
          </table>

          <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
            - Adam<br>Rebel Ape Marketing
          </p>
          <p style="color: #9ca3af; font-size: 13px; margin: 16px 0 0 0;">
            P.S. - Most contractors can fix 3-4 of these issues themselves in a weekend. The rest? That's where we come in.
          </p>
        </td></tr>
        <tr><td style="background-color: #18181b; padding: 30px 40px; text-align: center;">
          <p style="color: #a1a1aa; font-size: 14px; margin: 0 0 10px 0;">Rebel Ape Marketing</p>
          <p style="color: #71717a; font-size: 12px; margin: 0;">Marketing that actually works for contractors.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildLeadNotificationEmail({ name, email, phone, website, score, grade, gradeMessage, topIssues, passedChecks, failedChecks, questionAnswers, scores }) {
  const issuesList = (topIssues || []).slice(0, 5).map(i =>
    `<tr><td style="padding: 8px 12px; color: #991b1b; border-bottom: 1px solid #fef2f2;">${i.name}</td><td style="padding: 8px 12px; color: #6b7280; font-size: 13px; border-bottom: 1px solid #fef2f2;">${i.details}</td></tr>`
  ).join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5;">
  <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
    <tr><td style="background-color: #069c4b; padding: 20px; color: #ffffff;">
      <h2 style="margin: 0;">New Website Audit Lead</h2>
      <p style="margin: 5px 0 0 0; opacity: 0.9;">${name} — Score: ${score}/100</p>
    </td></tr>
    <tr><td style="padding: 30px;">
      <h3 style="margin: 0 0 15px 0; color: #374151;">Contact Info</h3>
      <table width="100%" style="margin-bottom: 25px;">
        <tr><td style="padding: 8px 0; color: #6b7280; width: 120px;">Name:</td><td style="padding: 8px 0; color: #111827; font-weight: 600;">${name}</td></tr>
        <tr><td style="padding: 8px 0; color: #6b7280;">Email:</td><td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #069c4b;">${email}</a></td></tr>
        <tr><td style="padding: 8px 0; color: #6b7280;">Phone:</td><td style="padding: 8px 0;"><a href="tel:${phone || ''}" style="color: #069c4b;">${phone || 'Not provided'}</a></td></tr>
        <tr><td style="padding: 8px 0; color: #6b7280;">Website:</td><td style="padding: 8px 0;"><a href="${website}" style="color: #069c4b;">${website}</a></td></tr>
      </table>

      <h3 style="margin: 0 0 15px 0; color: #374151;">Audit Results</h3>
      <table width="100%" style="margin-bottom: 25px; background-color: #f8fafc; border-radius: 8px;">
        <tr><td style="padding: 12px; color: #6b7280;">Score:</td><td style="padding: 12px; color: #069c4b; font-weight: 800; font-size: 20px;">${score}/100</td></tr>
        <tr><td style="padding: 12px; color: #6b7280;">Grade:</td><td style="padding: 12px; color: #111827;">${gradeMessage}</td></tr>
        <tr><td style="padding: 12px; color: #6b7280;">Technical:</td><td style="padding: 12px; color: #111827;">${scores?.technical || 0}/25</td></tr>
        <tr><td style="padding: 12px; color: #6b7280;">Conversion:</td><td style="padding: 12px; color: #111827;">${scores?.conversion || 0}/25</td></tr>
        <tr><td style="padding: 12px; color: #6b7280;">Hero/Messaging:</td><td style="padding: 12px; color: #111827;">${scores?.hero || 0}/25</td></tr>
        <tr><td style="padding: 12px; color: #6b7280;">Trust Signals:</td><td style="padding: 12px; color: #111827;">${scores?.trust || 0}/25</td></tr>
      </table>

      ${issuesList ? `
      <h3 style="margin: 0 0 15px 0; color: #374151;">Top Issues</h3>
      <table width="100%" style="margin-bottom: 25px; background: #fef2f2; border-radius: 8px; overflow: hidden;">
        ${issuesList}
      </table>` : ''}

      <h3 style="margin: 0 0 15px 0; color: #374151;">Question Answers</h3>
      <table width="100%" style="background-color: #f8fafc; border-radius: 8px;">
        <tr><td style="padding: 8px 12px; color: #6b7280;">Running Ads:</td><td style="padding: 8px 12px; color: #111827;">${questionAnswers?.runningAds || 'N/A'}</td></tr>
        <tr><td style="padding: 8px 12px; color: #6b7280;">Branded Photos:</td><td style="padding: 8px 12px; color: #111827;">${questionAnswers?.brandedPhotos || 'N/A'}</td></tr>
        <tr><td style="padding: 8px 12px; color: #6b7280;">Hero Promise:</td><td style="padding: 8px 12px; color: #111827;">${questionAnswers?.heroPromise || 'N/A'}</td></tr>
        <tr><td style="padding: 8px 12px; color: #6b7280;">CTA Above Fold:</td><td style="padding: 8px 12px; color: #111827;">${questionAnswers?.ctaAboveFold || 'N/A'}</td></tr>
        <tr><td style="padding: 8px 12px; color: #6b7280;">Messaging:</td><td style="padding: 8px 12px; color: #111827;">${questionAnswers?.messaging || 'N/A'}</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
