// Netlify Function to scan a website for the Website Audit Tool
// Fetches HTML, analyzes content, and calls Google PageSpeed Insights API
//
// 20 checks across 4 categories (5 pts each = 100 total):
//
// TECHNICAL (25 pts): Mobile Responsive, Page Speed, SSL, Broken Links, FAQ Section
// CONVERSION (25 pts): Phone Visible, Click-to-Call, Contact Form/Page, Clear CTAs, Services Catalog
// CONTENT & MESSAGING (25 pts): 5 question-based checks scored client-side (Hero, CTA Fold, Problem/Solution, Why Us, Photos)
// TRUST & PROOF (25 pts): Testimonials, Results/Outcomes, Credentials, About/Team Page, Google Business Profile

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
    const { url } = JSON.parse(event.body);

    if (!url) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'URL is required' }) };
    }

    // Normalize URL
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }

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
      scores: { technical: 0, conversion: 0, content: 0, trust: 0 },
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

    // --- PROCESS HTML ANALYSIS ---
    if (htmlAnalysis.status === 'fulfilled' && htmlAnalysis.value) {
      const html = htmlAnalysis.value;

      // ========== TECHNICAL FOUNDATION ==========

      // Mobile Responsive (5 pts)
      const hasViewport = /<meta[^>]*name\s*=\s*["']viewport["'][^>]*>/i.test(html.raw);
      const hasResponsiveCSS = /(@media|max-width|min-width)/i.test(html.raw);
      const mobileScore = hasViewport ? (hasResponsiveCSS ? 5 : 3) : 0;
      results.checks.mobileResponsive = {
        score: mobileScore,
        maxScore: 5,
        passed: mobileScore >= 3,
        details: hasViewport
          ? (hasResponsiveCSS ? 'Mobile viewport and responsive CSS detected' : 'Viewport tag found but limited responsive CSS')
          : 'No viewport meta tag found — site likely not mobile-friendly'
      };

      // SSL Certificate (5 pts)
      const hasSSL = normalizedUrl.startsWith('https://');
      results.checks.ssl = {
        score: hasSSL ? 5 : 0,
        maxScore: 5,
        passed: hasSSL,
        details: hasSSL ? 'Site uses HTTPS (SSL secured)' : 'Site is not using HTTPS — visitors see "Not Secure" warning'
      };

      // Broken Links (5 pts)
      const linkCount = (html.raw.match(/<a\s[^>]*href\s*=/gi) || []).length;
      const hasDeadLinks = /href\s*=\s*["']#["']/gi.test(html.raw);
      const brokenScore = hasDeadLinks ? 2 : 5;
      results.checks.brokenLinks = {
        score: brokenScore,
        maxScore: 5,
        passed: brokenScore >= 4,
        details: hasDeadLinks
          ? `Found placeholder (#) links. ${linkCount} total links detected.`
          : `${linkCount} links found, no obvious placeholder links detected.`
      };

      // FAQ Section (5 pts)
      const faqKeywords = /\b(faq|frequently\s+asked|common\s+questions)\b/i;
      const hasAccordion = /<(details|summary)[\s>]/i.test(html.raw) || /accordion|collapse|expandable/i.test(html.raw);
      const hasFaqContent = faqKeywords.test(html.raw);
      const hasFaq = hasFaqContent || hasAccordion;
      results.checks.faqSection = {
        score: hasFaq ? 5 : 0,
        maxScore: 5,
        passed: hasFaq,
        details: hasFaq
          ? 'FAQ or expandable Q&A section detected'
          : 'No FAQ section found — visitors leave when common questions go unanswered'
      };

      // ========== CONVERSION ELEMENTS ==========

      // Phone Number Visible (5 pts)
      const phoneRegex = /(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g;
      const phoneMatches = html.raw.match(phoneRegex) || [];
      const hasPhone = phoneMatches.length > 0;
      results.checks.phoneVisible = {
        score: hasPhone ? 5 : 0,
        maxScore: 5,
        passed: hasPhone,
        details: hasPhone
          ? `Phone number found: ${phoneMatches[0]}`
          : 'No phone number detected on the page'
      };

      // Click-to-Call (5 pts)
      const hasTelLink = /href\s*=\s*["']tel:/i.test(html.raw);
      results.checks.clickToCall = {
        score: hasTelLink ? 5 : 0,
        maxScore: 5,
        passed: hasTelLink,
        details: hasTelLink
          ? 'Click-to-call link detected (tel: link)'
          : 'No click-to-call link found — mobile visitors can\'t tap to call'
      };

      // Contact Form or Contact Page (5 pts)
      // Check for: <form> tags, OR links to /contact, /schedule, /book, /get-started, etc.
      const hasForm = /<form[\s>]/i.test(html.raw);
      const hasInputFields = /<input[^>]*type\s*=\s*["'](text|email|tel|submit)["']/i.test(html.raw);
      const contactPageLinks = /href\s*=\s*["'][^"']*\/(contact|schedule|book|get-started|request|appointment|free-estimate|consultation|get-quote|quote)[^"']*["']/i.test(html.raw);
      let contactScore = 0;
      let contactDetails = '';
      if (hasForm) {
        contactScore = 5;
        contactDetails = 'Contact form detected on the page';
      } else if (contactPageLinks) {
        contactScore = 5;
        contactDetails = 'Link to contact/scheduling page detected';
      } else if (hasInputFields) {
        contactScore = 3;
        contactDetails = 'Some form elements found but no complete form or contact page link';
      } else {
        contactDetails = 'No contact form or contact page link found';
      }
      results.checks.contactForm = {
        score: contactScore,
        maxScore: 5,
        passed: contactScore >= 4,
        details: contactDetails
      };

      // Clear CTAs (5 pts)
      const ctaKeywords = /\b(schedule|call|contact|get|request|book|free|estimate|quote|consultation|start|hire)\b/gi;
      const buttonAndLinks = html.raw.match(/<(button|a)[^>]*>[\s\S]*?<\/(button|a)>/gi) || [];
      const ctaButtons = buttonAndLinks.filter(el => ctaKeywords.test(el));
      const ctaScore = ctaButtons.length >= 2 ? 5 : (ctaButtons.length === 1 ? 3 : 0);
      results.checks.clearCTAs = {
        score: ctaScore,
        maxScore: 5,
        passed: ctaScore >= 3,
        details: ctaButtons.length >= 2
          ? `${ctaButtons.length} clear call-to-action elements found`
          : (ctaButtons.length === 1 ? '1 CTA found — could use more prominent calls to action' : 'No clear calls to action found (Schedule, Call, Get Estimate, etc.)')
      };

      // Services Catalog (5 pts)
      // Look for /services/ links, service-related page structure, service listings
      const serviceLinks = html.raw.match(/href\s*=\s*["'][^"']*\/services?[^"']*["']/gi) || [];
      const hasServiceSection = /\b(our\s+services|what\s+we\s+(do|offer)|service\s+areas?)\b/i.test(html.raw);
      const serviceCount = serviceLinks.length;
      let serviceScore = 0;
      let serviceDetails = '';
      if (serviceCount >= 3) {
        serviceScore = 5;
        serviceDetails = `${serviceCount} service page links found — good service catalog`;
      } else if (serviceCount >= 1 || hasServiceSection) {
        serviceScore = 3;
        serviceDetails = 'Some service content found but limited service catalog';
      } else {
        serviceDetails = 'No service catalog or service page links detected';
      }
      results.checks.servicesCatalog = {
        score: serviceScore,
        maxScore: 5,
        passed: serviceScore >= 3,
        details: serviceDetails
      };

      // ========== TRUST & PROOF (auto-scan portion) ==========

      // Testimonials/Reviews (5 pts)
      const testimonialKeywords = /testimonial|review|what our (customer|client)|feedback|rating|star[s]?\b|★|google\s*review/i;
      const hasTestimonials = testimonialKeywords.test(html.raw);
      results.checks.testimonials = {
        score: hasTestimonials ? 5 : 0,
        maxScore: 5,
        passed: hasTestimonials,
        details: hasTestimonials
          ? 'Testimonial or review section detected'
          : 'No testimonials or reviews found — major trust signal missing'
      };

      // Results/Outcomes (5 pts)
      // Look for case studies, before/after, stats, results language
      const resultsKeywords = /\b(case\s+stud|results|before\s+(&|and)\s+after|portfolio|our\s+work|projects?\s+completed|success\s+stor|outcomes?)\b/i;
      const hasStats = /\b(\d+[,.]?\d*\s*(%|\+|projects?|homes?|customers?|clients?|jobs?|years?))\b/i.test(html.raw);
      const hasResults = resultsKeywords.test(html.raw) || hasStats;
      results.checks.resultsOutcomes = {
        score: hasResults ? 5 : 0,
        maxScore: 5,
        passed: hasResults,
        details: hasResults
          ? 'Results, case studies, or outcome metrics detected'
          : 'No visible results, case studies, or outcome proof found'
      };

      // Credentials Visible (5 pts)
      const credentialKeywords = /\b(years?|since\s+\d{4}|certified|licensed|insured|bonded|accredited|bbb|angi|home\s*advisor|certification|credential|award)/i;
      const hasCredentials = credentialKeywords.test(html.raw);
      results.checks.credentials = {
        score: hasCredentials ? 5 : 0,
        maxScore: 5,
        passed: hasCredentials,
        details: hasCredentials
          ? 'Credentials or experience indicators detected'
          : 'No visible credentials, certifications, or experience indicators found'
      };

      // About / Team Page (5 pts)
      const aboutPageLinks = /href\s*=\s*["'][^"']*\/(about|our-team|meet-the-team|who-we-are|our-story)[^"']*["']/i.test(html.raw);
      const hasTeamContent = /\b(about\s+us|meet\s+(the|our)\s+team|our\s+story|who\s+we\s+are|family[\s-]owned|locally[\s-]owned)\b/i.test(html.raw);
      const hasAboutPage = aboutPageLinks || hasTeamContent;
      results.checks.aboutPage = {
        score: hasAboutPage ? 5 : 0,
        maxScore: 5,
        passed: hasAboutPage,
        details: hasAboutPage
          ? 'About/Team page or section detected — humanizes your business'
          : 'No about page or team section found — homeowners want to know who they\'re hiring'
      };

      // Google Business Profile (5 pts)
      const hasGoogleMaps = /google\.com\/maps|maps\.googleapis|goo\.gl\/maps/i.test(html.raw);
      const hasGoogleReviewLink = /google\.com\/(search|maps).*review|g\.page|business\.google/i.test(html.raw);
      const hasMapEmbed = /<iframe[^>]*google[^>]*maps?[^>]*>/i.test(html.raw);
      const hasGBP = hasGoogleMaps || hasGoogleReviewLink || hasMapEmbed;
      results.checks.googleBusiness = {
        score: hasGBP ? 5 : 0,
        maxScore: 5,
        passed: hasGBP,
        details: hasGBP
          ? 'Google Maps embed or Google Business link detected'
          : 'No Google Maps or Google Business Profile link found — a key local trust signal'
      };

      // Informational: generic language detection (not scored)
      const genericWords = /\b(quality craftsmanship|trusted|experienced professionals?|reliable|dedicated|excellence)\b/gi;
      const genericMatches = html.raw.match(genericWords) || [];
      results.checks.genericLanguage = {
        isGeneric: genericMatches.length >= 2,
        count: genericMatches.length,
        words: [...new Set(genericMatches.map(w => w.toLowerCase()))].slice(0, 5)
      };

    } else {
      // HTML fetch failed — set defaults
      results.checks.fetchError = {
        error: true,
        details: 'Could not fetch website content. The site may be blocking automated requests or may be down.'
      };
      const hasSSL = normalizedUrl.startsWith('https://');
      results.checks.ssl = { score: hasSSL ? 5 : 0, maxScore: 5, passed: hasSSL, details: hasSSL ? 'Site uses HTTPS' : 'Not using HTTPS' };
      results.checks.mobileResponsive = { score: 0, maxScore: 5, passed: false, details: 'Could not scan' };
      results.checks.brokenLinks = { score: 0, maxScore: 5, passed: false, details: 'Could not scan' };
      results.checks.faqSection = { score: 0, maxScore: 5, passed: false, details: 'Could not scan' };
      results.checks.phoneVisible = { score: 0, maxScore: 5, passed: false, details: 'Could not scan' };
      results.checks.clickToCall = { score: 0, maxScore: 5, passed: false, details: 'Could not scan' };
      results.checks.contactForm = { score: 0, maxScore: 5, passed: false, details: 'Could not scan' };
      results.checks.clearCTAs = { score: 0, maxScore: 5, passed: false, details: 'Could not scan' };
      results.checks.servicesCatalog = { score: 0, maxScore: 5, passed: false, details: 'Could not scan' };
      results.checks.testimonials = { score: 0, maxScore: 5, passed: false, details: 'Could not scan' };
      results.checks.resultsOutcomes = { score: 0, maxScore: 5, passed: false, details: 'Could not scan' };
      results.checks.credentials = { score: 0, maxScore: 5, passed: false, details: 'Could not scan' };
      results.checks.aboutPage = { score: 0, maxScore: 5, passed: false, details: 'Could not scan' };
      results.checks.googleBusiness = { score: 0, maxScore: 5, passed: false, details: 'Could not scan' };
    }

    // --- PROCESS PAGESPEED DATA ---
    if (pageSpeedData.status === 'fulfilled' && pageSpeedData.value) {
      const psi = pageSpeedData.value;
      const perfScore = Math.round((psi.performanceScore || 0) * 100);
      const speedScore = perfScore >= 70 ? 5 : (perfScore >= 50 ? 3 : 1);

      results.checks.pageSpeed = {
        score: speedScore,
        maxScore: 5,
        passed: speedScore >= 3,
        performanceScore: perfScore,
        lcp: psi.lcp,
        fid: psi.fid,
        cls: psi.cls,
        details: perfScore >= 70
          ? `PageSpeed score: ${perfScore}/100 — Good performance`
          : (perfScore >= 50 ? `PageSpeed score: ${perfScore}/100 — Needs improvement` : `PageSpeed score: ${perfScore}/100 — Poor, visitors are bouncing`)
      };

      // Override mobile check with PSI data if available
      if (psi.mobileUsability && results.checks.mobileResponsive) {
        results.checks.mobileResponsive.score = 5;
        results.checks.mobileResponsive.passed = true;
        results.checks.mobileResponsive.details = 'Google confirms the site is mobile-friendly';
      }
    } else {
      results.checks.pageSpeed = {
        score: 2,
        maxScore: 5,
        passed: false,
        performanceScore: null,
        details: 'Could not retrieve PageSpeed data — try again or check if the URL is publicly accessible'
      };
    }

    // --- CALCULATE CATEGORY SCORES (auto-scan only, questions added client-side) ---

    // Technical (25 pts): mobileResponsive(5) + pageSpeed(5) + ssl(5) + brokenLinks(5) + faqSection(5)
    results.scores.technical =
      (results.checks.mobileResponsive?.score || 0) +
      (results.checks.pageSpeed?.score || 0) +
      (results.checks.ssl?.score || 0) +
      (results.checks.brokenLinks?.score || 0) +
      (results.checks.faqSection?.score || 0);

    // Conversion (25 pts): phoneVisible(5) + clickToCall(5) + contactForm(5) + clearCTAs(5) + servicesCatalog(5)
    results.scores.conversion =
      (results.checks.phoneVisible?.score || 0) +
      (results.checks.clickToCall?.score || 0) +
      (results.checks.contactForm?.score || 0) +
      (results.checks.clearCTAs?.score || 0) +
      (results.checks.servicesCatalog?.score || 0);

    // Trust & Proof (25 pts): testimonials(5) + resultsOutcomes(5) + credentials(5) + aboutPage(5) + googleBusiness(5)
    results.scores.trust =
      (results.checks.testimonials?.score || 0) +
      (results.checks.resultsOutcomes?.score || 0) +
      (results.checks.credentials?.score || 0) +
      (results.checks.aboutPage?.score || 0) +
      (results.checks.googleBusiness?.score || 0);

    // Content & Messaging: all 25 pts from questions, scored client-side
    results.scores.content = 0;

    results.totalScore = results.scores.technical + results.scores.conversion + results.scores.trust + results.scores.content;

    // --- COLLECT TOP ISSUES ---
    const allChecks = [
      { key: 'pageSpeed', name: 'Page Speed', category: 'Technical' },
      { key: 'mobileResponsive', name: 'Mobile Responsive', category: 'Technical' },
      { key: 'ssl', name: 'SSL Certificate', category: 'Technical' },
      { key: 'brokenLinks', name: 'Broken Links', category: 'Technical' },
      { key: 'faqSection', name: 'FAQ Section', category: 'Technical' },
      { key: 'phoneVisible', name: 'Phone Number Visible', category: 'Conversion' },
      { key: 'clickToCall', name: 'Click-to-Call on Mobile', category: 'Conversion' },
      { key: 'contactForm', name: 'Contact Form/Page', category: 'Conversion' },
      { key: 'clearCTAs', name: 'Clear CTAs', category: 'Conversion' },
      { key: 'servicesCatalog', name: 'Services Catalog', category: 'Conversion' },
      { key: 'testimonials', name: 'Testimonials/Reviews', category: 'Trust' },
      { key: 'resultsOutcomes', name: 'Results/Outcomes', category: 'Trust' },
      { key: 'credentials', name: 'Credentials Visible', category: 'Trust' },
      { key: 'aboutPage', name: 'About / Team Page', category: 'Trust' },
      { key: 'googleBusiness', name: 'Google Business Profile', category: 'Trust' }
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
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
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
    // Use API key if available for higher rate limits
    const apiKey = process.env.PAGESPEED_API_KEY;
    let apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&category=PERFORMANCE&category=ACCESSIBILITY`;
    if (apiKey) {
      apiUrl += `&key=${apiKey}`;
    }

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
      mobileUsability: true
    };
  } catch (error) {
    console.error('PageSpeed API error:', error.message);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
