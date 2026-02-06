// Netlify Function to scan a website for the Website Audit Tool
// Fetches HTML, analyzes content, and calls Google PageSpeed Insights API

exports.handler = async (event) => {
  // CORS headers
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
    const { url } = JSON.parse(event.body);

    if (!url) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'URL is required' }) };
    }

    // Normalize URL
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }

    // Validate URL
    let parsedUrl;
    try {
      parsedUrl = new URL(normalizedUrl);
    } catch {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid URL format' }) };
    }

    const results = {
      url: normalizedUrl,
      hostname: parsedUrl.hostname,
      checks: {},
      scores: { technical: 0, conversion: 0, hero: 0, trust: 0 },
      totalScore: 0,
      grade: '',
      gradeMessage: '',
      topIssues: []
    };

    // Run scans in parallel
    const [htmlAnalysis, pageSpeedData] = await Promise.allSettled([
      fetchAndAnalyzeHTML(normalizedUrl),
      fetchPageSpeedData(normalizedUrl)
    ]);

    // Process HTML analysis
    if (htmlAnalysis.status === 'fulfilled' && htmlAnalysis.value) {
      const html = htmlAnalysis.value;

      // 1. Mobile Responsive (7 pts)
      const hasViewport = /<meta[^>]*name\s*=\s*["']viewport["'][^>]*>/i.test(html.raw);
      const hasResponsiveCSS = /(@media|max-width|min-width)/i.test(html.raw);
      const mobileScore = hasViewport ? (hasResponsiveCSS ? 7 : 4) : 0;
      results.checks.mobileResponsive = {
        score: mobileScore,
        maxScore: 7,
        passed: mobileScore >= 4,
        details: hasViewport
          ? (hasResponsiveCSS ? 'Mobile viewport and responsive CSS detected' : 'Viewport tag found but limited responsive CSS')
          : 'No viewport meta tag found — site likely not mobile-friendly'
      };

      // 3. SSL Certificate (5 pts)
      const hasSSL = normalizedUrl.startsWith('https://');
      results.checks.ssl = {
        score: hasSSL ? 5 : 0,
        maxScore: 5,
        passed: hasSSL,
        details: hasSSL ? 'Site uses HTTPS (SSL secured)' : 'Site is not using HTTPS — visitors see "Not Secure" warning'
      };

      // 4. Broken Links — we check for obviously broken patterns
      const linkCount = (html.raw.match(/<a\s[^>]*href\s*=/gi) || []).length;
      const hasDeadLinks = /href\s*=\s*["']#["']/gi.test(html.raw);
      const brokenScore = hasDeadLinks ? 3 : 6;
      results.checks.brokenLinks = {
        score: brokenScore,
        maxScore: 6,
        passed: brokenScore >= 5,
        details: hasDeadLinks
          ? `Found placeholder (#) links. ${linkCount} total links detected.`
          : `${linkCount} links found, no obvious placeholder links detected.`
      };

      // 5. Phone Number Visible (7 pts)
      const phoneRegex = /(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g;
      const phoneMatches = html.raw.match(phoneRegex) || [];
      const hasPhone = phoneMatches.length > 0;
      results.checks.phoneVisible = {
        score: hasPhone ? 7 : 0,
        maxScore: 7,
        passed: hasPhone,
        details: hasPhone
          ? `Phone number found: ${phoneMatches[0]}`
          : 'No phone number detected on the page'
      };

      // 6. Click-to-Call (6 pts)
      const hasTelLink = /href\s*=\s*["']tel:/i.test(html.raw);
      results.checks.clickToCall = {
        score: hasTelLink ? 6 : 0,
        maxScore: 6,
        passed: hasTelLink,
        details: hasTelLink
          ? 'Click-to-call link detected (tel: link)'
          : 'No click-to-call link found — mobile visitors can\'t tap to call'
      };

      // 7. Contact Form Present (6 pts)
      const hasForm = /<form[\s>]/i.test(html.raw);
      const hasInputFields = /<input[^>]*type\s*=\s*["'](text|email|tel|submit)["']/i.test(html.raw);
      const formScore = hasForm ? 6 : (hasInputFields ? 3 : 0);
      results.checks.contactForm = {
        score: formScore,
        maxScore: 6,
        passed: formScore >= 4,
        details: hasForm
          ? 'Contact form detected on the page'
          : (hasInputFields ? 'Some form elements found but no complete form detected' : 'No contact form found on the page')
      };

      // 8. Clear CTAs (6 pts)
      const ctaKeywords = /\b(schedule|call|contact|get|request|book|free|estimate|quote|consultation|start|hire)\b/gi;
      const buttonAndLinks = html.raw.match(/<(button|a)[^>]*>[\s\S]*?<\/(button|a)>/gi) || [];
      const ctaButtons = buttonAndLinks.filter(el => ctaKeywords.test(el));
      const ctaScore = ctaButtons.length >= 2 ? 6 : (ctaButtons.length === 1 ? 4 : 0);
      results.checks.clearCTAs = {
        score: ctaScore,
        maxScore: 6,
        passed: ctaScore >= 4,
        details: ctaButtons.length >= 2
          ? `${ctaButtons.length} clear call-to-action elements found`
          : (ctaButtons.length === 1 ? '1 CTA found — could use more prominent calls to action' : 'No clear calls to action found (Schedule, Call, Get Estimate, etc.)')
      };

      // 12. Testimonials/Reviews (8 pts)
      const testimonialKeywords = /testimonial|review|what our (customer|client)|feedback|rating|star[s]?\b|★/i;
      const hasTestimonials = testimonialKeywords.test(html.raw);
      results.checks.testimonials = {
        score: hasTestimonials ? 8 : 0,
        maxScore: 8,
        passed: hasTestimonials,
        details: hasTestimonials
          ? 'Testimonial or review section detected'
          : 'No testimonials or reviews found — major trust signal missing'
      };

      // 14. Credentials Visible (8 pts)
      const credentialKeywords = /\b(years?|since\s+\d{4}|certified|licensed|insured|bonded|accredited|bbb|angi|home\s*advisor|certification|credential)/i;
      const hasCredentials = credentialKeywords.test(html.raw);
      results.checks.credentials = {
        score: hasCredentials ? 8 : 0,
        maxScore: 8,
        passed: hasCredentials,
        details: hasCredentials
          ? 'Credentials or experience indicators detected'
          : 'No visible credentials, certifications, or experience indicators found'
      };

      // Check for generic contractor language (informational, not scored)
      const genericWords = /\b(quality craftsmanship|trusted|experienced professionals?|reliable|dedicated|excellence)\b/gi;
      const genericMatches = html.raw.match(genericWords) || [];
      results.checks.genericLanguage = {
        isGeneric: genericMatches.length >= 2,
        count: genericMatches.length,
        words: [...new Set(genericMatches.map(w => w.toLowerCase()))].slice(0, 5)
      };

    } else {
      // HTML fetch failed
      results.checks.fetchError = {
        error: true,
        details: 'Could not fetch website content. The site may be blocking automated requests or may be down.'
      };
      // Give partial credit for SSL if URL is HTTPS
      const hasSSL = normalizedUrl.startsWith('https://');
      results.checks.ssl = {
        score: hasSSL ? 5 : 0,
        maxScore: 5,
        passed: hasSSL,
        details: hasSSL ? 'Site uses HTTPS' : 'Site is not using HTTPS'
      };
    }

    // Process PageSpeed data
    if (pageSpeedData.status === 'fulfilled' && pageSpeedData.value) {
      const psi = pageSpeedData.value;
      const perfScore = Math.round((psi.performanceScore || 0) * 100);
      const speedScore = perfScore >= 70 ? 7 : (perfScore >= 50 ? 4 : 1);

      results.checks.pageSpeed = {
        score: speedScore,
        maxScore: 7,
        passed: speedScore >= 4,
        performanceScore: perfScore,
        lcp: psi.lcp,
        fid: psi.fid,
        cls: psi.cls,
        details: perfScore >= 70
          ? `PageSpeed score: ${perfScore}/100 — Good performance`
          : (perfScore >= 50 ? `PageSpeed score: ${perfScore}/100 — Needs improvement` : `PageSpeed score: ${perfScore}/100 — Poor, visitors are bouncing`)
      };

      // Use PSI mobile usability if available
      if (psi.mobileUsability !== undefined && results.checks.mobileResponsive) {
        if (psi.mobileUsability) {
          results.checks.mobileResponsive.score = 7;
          results.checks.mobileResponsive.passed = true;
          results.checks.mobileResponsive.details = 'Google confirms the site is mobile-friendly';
        }
      }
    } else {
      results.checks.pageSpeed = {
        score: 3,
        maxScore: 7,
        passed: false,
        performanceScore: null,
        details: 'Could not retrieve PageSpeed data — try again or check if the URL is publicly accessible'
      };
    }

    // Calculate category scores
    // Technical Foundation (25 pts): mobileResponsive(7) + pageSpeed(7) + ssl(5) + brokenLinks(6)
    results.scores.technical =
      (results.checks.mobileResponsive?.score || 0) +
      (results.checks.pageSpeed?.score || 0) +
      (results.checks.ssl?.score || 0) +
      (results.checks.brokenLinks?.score || 0);

    // Conversion Elements (25 pts): phoneVisible(7) + clickToCall(6) + contactForm(6) + clearCTAs(6)
    results.scores.conversion =
      (results.checks.phoneVisible?.score || 0) +
      (results.checks.clickToCall?.score || 0) +
      (results.checks.contactForm?.score || 0) +
      (results.checks.clearCTAs?.score || 0);

    // Trust Signals (25 pts from auto-scan): testimonials(8) + credentials(8) + photos placeholder(9)
    results.scores.trust =
      (results.checks.testimonials?.score || 0) +
      (results.checks.credentials?.score || 0);

    // Hero section scores will be added client-side from questions
    results.scores.hero = 0;

    // Total auto-scanned score (questions will add more)
    results.totalScore = results.scores.technical + results.scores.conversion + results.scores.trust + results.scores.hero;

    // Collect top issues
    const allChecks = [
      { key: 'pageSpeed', name: 'Page Speed', category: 'Technical' },
      { key: 'mobileResponsive', name: 'Mobile Responsive', category: 'Technical' },
      { key: 'ssl', name: 'SSL Certificate', category: 'Technical' },
      { key: 'brokenLinks', name: 'Broken Links', category: 'Technical' },
      { key: 'phoneVisible', name: 'Phone Number Visible', category: 'Conversion' },
      { key: 'clickToCall', name: 'Click-to-Call on Mobile', category: 'Conversion' },
      { key: 'contactForm', name: 'Contact Form', category: 'Conversion' },
      { key: 'clearCTAs', name: 'Clear CTAs', category: 'Conversion' },
      { key: 'testimonials', name: 'Testimonials/Reviews', category: 'Trust' },
      { key: 'credentials', name: 'Credentials Visible', category: 'Trust' }
    ];

    results.topIssues = allChecks
      .filter(check => results.checks[check.key] && !results.checks[check.key].passed)
      .map(check => ({
        name: check.name,
        category: check.category,
        details: results.checks[check.key].details,
        pointsLost: results.checks[check.key].maxScore - results.checks[check.key].score
      }))
      .sort((a, b) => b.pointsLost - a.pointsLost);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(results)
    };

  } catch (error) {
    console.error('Scan error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Scan failed: ' + error.message })
    };
  }
};

// Fetch the URL and return raw HTML for analysis
async function fetchAndAnalyzeHTML(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RebelApeAudit/1.0; +https://therebelape.com)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      redirect: 'follow'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const raw = await response.text();
    return { raw };
  } catch (error) {
    console.error('HTML fetch error:', error.message);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// Fetch Google PageSpeed Insights data
async function fetchPageSpeedData(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&category=PERFORMANCE&category=ACCESSIBILITY`;

    const response = await fetch(apiUrl, {
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`PageSpeed API returned ${response.status}`);
    }

    const data = await response.json();

    const lighthouse = data.lighthouseResult;
    if (!lighthouse) return null;

    const categories = lighthouse.categories || {};
    const audits = lighthouse.audits || {};

    return {
      performanceScore: categories.performance?.score || 0,
      lcp: audits['largest-contentful-paint']?.displayValue || 'N/A',
      fid: audits['max-potential-fid']?.displayValue || audits['total-blocking-time']?.displayValue || 'N/A',
      cls: audits['cumulative-layout-shift']?.displayValue || 'N/A',
      mobileUsability: true // PSI mobile strategy implies mobile testing
    };
  } catch (error) {
    console.error('PageSpeed API error:', error.message);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
