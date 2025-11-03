// Cloudflare Workers API for restaurant extraction
// Migrated from server.cjs to Workers runtime

// Claude API configuration
const CLAUDE_MODEL_VERSION = 'claude-sonnet-4-20250514';
const CLAUDE_API_VERSION = '2023-06-01';

// Helper function to infer city from location data
function inferCityFromLocation(location) {
  if (!location) return null;
  
  // Try to infer city from locationName or fullAddress
  const locationName = (location.locationName || '').toLowerCase();
  const fullAddress = (location.fullAddress || '').toLowerCase();
  
  // Common UK locations that should map to London
  const londonAreas = [
    'shoreditch', 'bermondsey', 'peckham', 'hackney', 'bethnal green',
    'spitalfields', 'whitechapel', 'borough', 'southwark', 'tower bridge',
    'london bridge', 'kings cross', 'islington', 'camden', 'fitzrovia',
    'covent garden', 'soho', 'mayfair', 'marylebone', 'bloomsbury',
    'clerkenwell', 'farringdon', 'barbican', 'holborn', 'strand',
    'westminster', 'pimlico', 'belgravia', 'knightsbridge', 'chelsea',
    'kensington', 'notting hill', 'paddington', 'bayswater', 'marylebone',
    'regent street', 'oxford street', 'bond street', 'piccadilly',
    'leicester square', 'trafalgar square', 'canary wharf', 'greenwich',
    'dulwich', 'east dulwich', 'north dulwich', 'west dulwich', 'brockley',
    'deptford', 'new cross', 'lewisham', 'catford', 'tooting'
  ];
  
  // Check if any London area matches
  for (const area of londonAreas) {
    if (locationName.includes(area) || fullAddress.includes(area)) {
      return 'London';
    }
  }
  
  // Check if "london" appears in the address
  if (fullAddress.includes('london')) {
    return 'London';
  }
  
  return null;
}

// Helper function to extract JSON from Claude's response
function extractJSONFromResponse(response) {
  try {
    // Try parsing the response as-is first
    return JSON.parse(response);
  } catch (e) {
    // If that fails, look for JSON content between braces
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e2) {
        console.error('Failed to parse extracted JSON:', jsonMatch[0]);
        throw new Error('Invalid JSON format in Claude response');
      }
    } else {
      console.error('No JSON found in Claude response:', response);
      throw new Error('No JSON found in Claude response');
    }
  }
}

// Call Claude API
async function callClaudeApi(prompt, apiKey) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': CLAUDE_API_VERSION
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL_VERSION,
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    // Return structured error instead of throwing
    return {
      isError: true,
      status: response.status,
      statusText: response.statusText,
      errorText: errorText,
      fullError: `Claude API error: ${response.status} ${response.statusText} - ${errorText}`
    };
  }

  const result = await response.json();
  return result.content[0].text;
}

// Fetch page content with proxy
async function fetchPageWithProxy(url) {
  // Instagram-specific handling
  if (isInstagramUrl(url)) {
    console.log('🟣 Instagram URL detected, using specialized scraping');
    return await fetchInstagramContent(url);
  }

  const proxies = [
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
  ];

  for (const proxyUrl of proxies) {
    try {
      const response = await fetch(proxyUrl);
      if (response.ok) {
        if (proxyUrl.includes('allorigins')) {
          const data = await response.json();
          return data.contents;
        } else {
          return await response.text();
        }
      }
    } catch (error) {
      continue;
    }
  }
  return null;
}

// Check if URL is Instagram
function isInstagramUrl(url) {
  return url.includes('instagram.com/') || url.includes('instagr.am/');
}

// Specialized Instagram content fetching
async function fetchInstagramContent(url) {
  const proxies = [
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
    // Instagram-specific proxy alternatives if needed
    `https://cors-anywhere.herokuapp.com/${encodeURIComponent(url)}`
  ];

  for (const proxyUrl of proxies) {
    try {
      const response = await fetch(proxyUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (response.ok) {
        let content;
        if (proxyUrl.includes('allorigins')) {
          const data = await response.json();
          content = data.contents;
        } else {
          content = await response.text();
        }

        // Instagram pages are heavily JavaScript-dependent, so we need to extract what we can
        if (content && content.length > 1000) {
          console.log('✅ Instagram content fetched via', proxyUrl.includes('allorigins') ? 'allorigins' : 'codetabs');
          return content;
        }
      }
    } catch (error) {
      console.log('❌ Instagram fetch failed via', proxyUrl, error.message);
      continue;
    }
  }

  console.log('⚠️ All Instagram proxy attempts failed, returning minimal content');
  return null;
}

// Extract meaningful content from HTML (same logic as server.cjs)
function extractMeaningfulContent(html, url = '') {
  if (!html) return '';

  try {
    // Check if this is Instagram content
    const isInstagram = isInstagramUrl(url);

    // Remove script tags and their content
    let cleaned = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Remove style tags and their content
    cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

    // Extract meta descriptions and titles
    const metaDesc = html.match(/<meta[^>]*name=['"]*description['"]*[^>]*content=['"]*([^'"]*)['"]*[^>]*>/i);
    const title = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const ogTitle = html.match(/<meta[^>]*property=['"]*og:title['"]*[^>]*content=['"]*([^'"]*)['"]*[^>]*>/i);
    const ogDesc = html.match(/<meta[^>]*property=['"]*og:description['"]*[^>]*content=['"]*([^'"]*)['"]*[^>]*>/i);

    // Instagram-specific meta tags
    const igType = html.match(/<meta[^>]*property=['"]*og:type['"]*[^>]*content=['"]*([^'"]*)['"]*[^>]*>/i);
    const igImage = html.match(/<meta[^>]*property=['"]*og:image['"]*[^>]*content=['"]*([^'"]*)['"]*[^>]*>/i);
    const igSiteName = html.match(/<meta[^>]*property=['"]*og:site_name['"]*[^>]*content=['"]*([^'"]*)['"]*[^>]*>/i);
    
    // Extract text from common content tags
    const headings = html.match(/<h[1-6][^>]*>([^<]*)<\/h[1-6]>/gi) || [];
    const paragraphs = html.match(/<p[^>]*>([^<]*)<\/p>/gi) || [];
    
    // Look for schema.org structured data
    const schemaMatches = html.match(/<script[^>]*type=['"]*application\/ld\+json['"]*[^>]*>([^<]*)<\/script>/gi) || [];
    
    // Look for address patterns in various formats
    const addressPatterns = [
      // UK postcodes with preceding address
      /([A-Za-z0-9\s,.-]+?)(?:,\s*)?([A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2})/gi,
      // French postcodes with preceding address
      /([A-Za-z0-9\s,.-]+?)(?:,\s*)?([0-9]{5})(?:\s+[A-Za-z\s-]+)?(?:,\s*France)?/gi,
      // US ZIP codes with preceding address
      /([A-Za-z0-9\s,.-]+?)(?:,\s*)?([0-9]{5}(?:-[0-9]{4})?)(?:\s+[A-Za-z\s,]+)?/gi,
      // Generic street addresses with numbers (international)
      /(\d+\s+[A-Za-z\s]+(?:Street|St|Road|Rd|Lane|Ln|Avenue|Ave|Drive|Dr|Place|Pl|Court|Ct|Square|Sq|Crescent|Cres|Rue|Boulevard|Blvd|Av|Passage|Impasse|Quai|Via|Strada|Piazza))/gi,
      // Location specific patterns
      /(?:address|location|find us|visit us|adresse|localisation|où nous trouver)[^:]*:?\s*([^<>\n]{20,150})/gi
    ];

    // Look for phone numbers
    const phonePattern = /(?:tel|phone|call|contact)[^:]*:?\s*([0-9\s\-\+\(\)]{10,20})/gi;
    
    
    // Instagram-specific content extraction
    if (isInstagram) {
      // Extract JSON-LD data which Instagram often uses
      const jsonLdPattern = /"@type":"([^"]*)"[^}]*"name":"([^"]*)"[^}]*"description":"([^"]*)"[^}]*"address":\{[^}]*"streetAddress":"([^"]*)"[^}]*"addressLocality":"([^"]*)"[^}]*"telephone":"([^"]*)"/g;
      const instagramJsonData = html.match(jsonLdPattern);

      // Extract profile info from window._sharedData
      const sharedDataPattern = /window\._sharedData\s*=\s*({.*?});/s;
      const sharedDataMatch = html.match(sharedDataPattern);

      // Extract bio and contact info from profile pages
      const bioPattern = /"biography":"([^"]*)"[^}]*"business_contact_method":"([^"]*)"[^}]*"business_email":"([^"]*)"[^}]*"business_phone_number":"([^"]*)"/g;
      const bioMatch = html.match(bioPattern);

      // Extract location mentions from captions and bio
      const locationPattern = /"text":"([^"]*(?:restaurant|cafe|bar|eatery|dining|food|kitchen|bistro|brasserie)[^"]*)"[^}]*"location"[^}]*"name":"([^"]*)"/gi;
      const locationMatches = html.match(locationPattern) || [];
    }

    // Combine meaningful content
    let meaningfulContent = [];

    if (title && title[1]) meaningfulContent.push(`TITLE: ${title[1].trim()}`);
    if (ogTitle && ogTitle[1]) meaningfulContent.push(`OG_TITLE: ${ogTitle[1].trim()}`);
    if (metaDesc && metaDesc[1]) meaningfulContent.push(`META_DESC: ${metaDesc[1].trim()}`);
    if (ogDesc && ogDesc[1]) meaningfulContent.push(`OG_DESC: ${ogDesc[1].trim()}`);

    // Instagram-specific meta content
    if (isInstagram) {
      if (igType && igType[1]) meaningfulContent.push(`IG_TYPE: ${igType[1].trim()}`);
      if (igSiteName && igSiteName[1]) meaningfulContent.push(`IG_SITE: ${igSiteName[1].trim()}`);

      // Add specific patterns for Instagram business profiles
      const businessPatterns = [
        /"category_name":"([^"]*restaurant[^"]*)"/gi,
        /"category_name":"([^"]*food[^"]*)"/gi,
        /"category_name":"([^"]*dining[^"]*)"/gi,
        /"public_phone_number":"([^"]*)"/gi,
        /"public_email":"([^"]*)"/gi,
        /"address_street":"([^"]*)"/gi,
        /"city_name":"([^"]*)"/gi
      ];

      businessPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(html)) !== null && match[1]) {
          meaningfulContent.push(`INSTAGRAM_DATA: ${match[1].trim()}`);
        }
      });
    }
    
    // Add headings
    headings.forEach(h => {
      const text = h.replace(/<[^>]*>/g, '').trim();
      if (text.length > 3 && text.length < 200) {
        meaningfulContent.push(`HEADING: ${text}`);
      }
    });
    
    // Add some paragraphs
    paragraphs.slice(0, 10).forEach(p => {
      const text = p.replace(/<[^>]*>/g, '').trim();
      if (text.length > 10 && text.length < 500) {
        meaningfulContent.push(`CONTENT: ${text}`);
      }
    });
    
    // Add schema data
    schemaMatches.forEach(schema => {
      const content = schema.match(/>([^<]*)</)[1];
      if (content) {
        meaningfulContent.push(`SCHEMA: ${content.trim()}`);
      }
    });
    
    // Extract address information
    addressPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const addressText = match[0].replace(/<[^>]*>/g, '').trim();
        if (addressText.length > 10 && addressText.length < 200) {
          meaningfulContent.push(`ADDRESS: ${addressText}`);
        }
      }
    });
    
    // Extract phone numbers
    let phoneMatch;
    while ((phoneMatch = phonePattern.exec(html)) !== null) {
      const phoneText = phoneMatch[1].replace(/[^\d\s\-\+\(\)]/g, '').trim();
      if (phoneText.length >= 10) {
        meaningfulContent.push(`PHONE: ${phoneText}`);
      }
    }
    
    
    // Look for location-specific content patterns (international cities)
    const locationKeywords = [
      // UK cities
      'london', 'manchester', 'liverpool', 'edinburgh', 'glasgow', 'birmingham', 'bristol', 'leeds', 'cardiff',
      // French cities
      'paris', 'lyon', 'marseille', 'toulouse', 'nice', 'nantes', 'strasbourg', 'montpellier', 'bordeaux',
      // US cities  
      'new york', 'los angeles', 'chicago', 'houston', 'phoenix', 'philadelphia', 'san antonio', 'san diego',
      // Other major cities
      'amsterdam', 'brussels', 'rome', 'milan', 'madrid', 'barcelona', 'berlin', 'munich', 'vienna', 'zurich'
    ];
    locationKeywords.forEach(city => {
      const cityRegex = new RegExp(`\\b${city}\\b[^\\n<>]{0,200}(?:\\d+\\s+[^\\n<>]{5,100}|[A-Z]{1,2}[0-9][A-Z0-9]?\\s?[0-9][A-Z]{2}|[0-9]{5}(?:-[0-9]{4})?|[0-9]{5}\\s+[A-Za-z\\s-]+)`, 'gi');
      let match;
      while ((match = cityRegex.exec(html)) !== null) {
        const locationText = match[0].trim();
        if (locationText.length > 15) {
          meaningfulContent.push(`LOCATION_DETAIL: ${locationText}`);
        }
      }
    });
    
    // Look for restaurant-specific patterns in URLs and content
    if (html.includes('menu') || html.includes('Menu') || html.includes('MENU')) {
      meaningfulContent.push('INDICATOR: Contains menu references');
    }
    if (html.includes('restaurant') || html.includes('Restaurant')) {
      meaningfulContent.push('INDICATOR: Contains restaurant references');
    }
    if (html.includes('book') || html.includes('reservation')) {
      meaningfulContent.push('INDICATOR: Contains booking references');
    }

    // Instagram-specific indicators
    if (isInstagram) {
      meaningfulContent.push('PLATFORM: Instagram business profile');

      // Look for food-related hashtags and keywords
      const foodKeywords = ['#restaurant', '#food', '#dining', '#eatery', '#cafe', '#bar', '#kitchen', '#chef', '#menu', '#delicious', '#tasty', '#foodie'];
      foodKeywords.forEach(keyword => {
        if (html.toLowerCase().includes(keyword.toLowerCase())) {
          meaningfulContent.push(`FOOD_INDICATOR: ${keyword}`);
        }
      });

      // Look for location and address patterns in Instagram data
      const addressPattern = /"address_street":"([^"]+)"/gi;
      const cityPattern = /"city_name":"([^"]+)"/gi;
      const phonePattern = /"public_phone_number":"([^"]+)"/gi;

      let match;
      while ((match = addressPattern.exec(html)) !== null) {
        meaningfulContent.push(`IG_ADDRESS: ${match[1]}`);
      }
      while ((match = cityPattern.exec(html)) !== null) {
        meaningfulContent.push(`IG_CITY: ${match[1]}`);
      }
      while ((match = phonePattern.exec(html)) !== null) {
        meaningfulContent.push(`IG_PHONE: ${match[1]}`);
      }
    }
    
    return meaningfulContent.join('\n\n');
    
  } catch (error) {
    console.error('Error extracting meaningful content:', error);
    return html.slice(0, 8000); // Fallback to raw content
  }
}

// Handle restaurant extraction request
async function handleRestaurantExtraction(request, env) {
  try {
    const { url } = await request.json();
    const apiKey = env.CLAUDE_API_KEY;
    
    if (!apiKey) {
      return Response.json({
        success: false,
        error: 'Claude API key not configured'
      }, { status: 500 });
    }

    if (!url) {
      return Response.json({
        success: false,
        error: 'URL is required'
      }, { status: 400 });
    }

    console.log('🔍 Starting extraction for:', url);

    // Check for trusted review sites that should bypass business type detection
    const trustedReviewSites = [
      'theinfatuation.com',
      'timeout.com',
      'opentable.com',
      'yelp.com',
      'tripadvisor.com',
      'intravel.net',
      'squaremeal.co.uk',
      'guide.michelin.com',
      'hardens.com',
      'restaurantguru.com'
    ];

    const urlDomain = new URL(url).hostname.replace('www.', '');
    const isTrustedReviewSite = trustedReviewSites.some(domain => urlDomain.includes(domain));

    console.log('🔍 URL domain:', urlDomain);
    console.log('🔍 Trusted review sites:', trustedReviewSites);
    console.log('🔍 Is trusted review site:', isTrustedReviewSite);

    if (isTrustedReviewSite) {
      console.log('✅ Trusted review site detected:', urlDomain, '- skipping business type detection');
    }

    // Fetch main page content
    const mainContent = await fetchPageWithProxy(url);
    if (!mainContent) {
      return Response.json({
        success: false,
        error: 'Could not fetch website content'
      }, { status: 500 });
    }

    console.log('📄 Content fetched, length:', mainContent.length);

    // Extract meaningful content from the HTML
    const meaningfulContent = extractMeaningfulContent(mainContent, url);
    console.log('🔍 Meaningful content extracted:', meaningfulContent.slice(0, 1000) + '...');

    // Limit content size to reduce token usage and avoid acceleration limits
    const limitedContent = meaningfulContent.slice(0, 8000); // ~2000 tokens max
    console.log('🔍 Using limited content for analysis, length:', limitedContent.length);

    // Business type detection (skip for trusted review sites)
    const isInstagramUrl = url.includes('instagram.com/') || url.includes('instagr.am/');

    if (!isTrustedReviewSite) {
      // Business type detection prompt with Instagram-specific handling
      const businessPrompt = `
Analyze this ${isInstagramUrl ? 'Instagram profile' : 'website'} content and determine if this is a restaurant business.

CONTENT:
<${isInstagramUrl ? 'instagram_profile' : 'website'}_content>
${limitedContent}
</${isInstagramUrl ? 'instagram_profile' : 'website'}_content>

ANALYSIS REQUIRED:
1. Is this primarily a restaurant/dining establishment?
2. If not, what type of business is it?

Return JSON in this format:
{
  "businessType": "restaurant|cafe|bakery|bar|pub|hotel|retail|gallery|bookshop|service|other",
  "confidence": "high|medium|low",
  "reasoning": "Brief explanation of your determination"
}

BUSINESS TYPE DEFINITIONS:
- restaurant: Primarily serves food/drinks for dine-in
- cafe: Coffee shop or casual eatery with food service
- bakery: Bakery with seating/food service (not just retail baked goods)
- bar: Bar or pub serving drinks with food options
- pub: Traditional pub serving drinks and meals
- hotel: Accommodation with possible restaurant component
- retail: Sells products/goods (without significant food service)
- gallery: Art gallery or museum
- bookshop: Bookstore or library
- service: Professional services, consulting, etc.
- other: Doesn't fit clear categories

${isInstagramUrl ? `
INSTAGRAM-SPECIFIC GUIDANCE:
- Look for PLATFORM indicators showing this is an Instagram business profile
- Pay attention to IG_ADDRESS, IG_CITY, IG_PHONE fields for business information
- Check for FOOD_INDICATOR tags showing food-related hashtags and keywords
- Instagram business categories (category_name) often indicate restaurant businesses
- Look for bio content mentioning food, dining, chef, restaurant concepts
- Food photos and meal posts are strong indicators of restaurant businesses
` : ''}

IMPORTANT: If you find a hotel or venue with a restaurant component, classify as "restaurant" only if the restaurant is the primary business focus.
FOOD SERVICE PRIORITY: If a business serves food for sit-in dining (even if they also sell retail products), classify it as the appropriate food service type (restaurant/cafe/bakery/bar/pub) rather than "retail".
${isInstagramUrl ? '- Instagram food influencers or personal accounts should be classified as "other" unless they represent an actual restaurant business' : ''}
`;

    const businessResponse = await callClaudeApi(businessPrompt, apiKey);
    console.log('🔍 Raw business response:', businessResponse);
    
    // Check if Claude API returned an error
    if (businessResponse.isError) {
      // Handle rate limit specifically
      if (businessResponse.status === 429 || businessResponse.errorText.includes('rate_limit_error')) {
        return Response.json({
          success: false,
          error: 'Claude API rate limit reached. Please wait 2-3 minutes before trying again.',
          isRateLimited: true,
          retryAfter: 180 // 3 minutes in seconds
        }, { status: 429 });
      }
      
      // Handle other API errors
      return Response.json({
        success: false,
        error: 'Claude API is temporarily unavailable. Please try again later.',
        isApiError: true
      }, { status: 503 });
    }
    
    // Extract JSON from Claude's response (sometimes it includes extra text)
    const businessAnalysis = extractJSONFromResponse(businessResponse);
    console.log('🔍 Business analysis:', businessAnalysis);

    const validFoodBusinessTypes = ['restaurant', 'cafe', 'bakery', 'bar', 'pub'];
    if (!validFoodBusinessTypes.includes(businessAnalysis.businessType)) {
      // Special handling for Instagram login wall
      if (isInstagramUrl && businessAnalysis.reasoning &&
          (businessAnalysis.reasoning.toLowerCase().includes('login') ||
           businessAnalysis.reasoning.toLowerCase().includes('instagram') && businessAnalysis.reasoning.toLowerCase().includes('code'))) {
        return Response.json({
          success: false,
          isInstagramLoginWall: true,
          message: `Instagram requires login to view this profile. Due to Instagram's privacy settings, automatic extraction is not possible. Please manually enter the restaurant details or try using the restaurant's main website instead.`
        });
      }

      return Response.json({
        success: false,
        isNotRestaurant: true,
        detectedType: businessAnalysis.businessType,
        message: `This appears to be a ${businessAnalysis.businessType} website, not a restaurant. Please use manual entry instead.`
      });
    }
    } // End of business type detection block

    // Restaurant extraction prompt with Instagram-specific handling
    const restaurantPrompt = `
Analyze this restaurant ${isInstagramUrl ? 'Instagram profile' : 'website'} content and extract structured information:

CONTENT TO ANALYZE:
${limitedContent}

EXTRACT THE FOLLOWING and return as JSON:
{
  "name": "Official restaurant name",
  "addressSummary": "Human-readable location summary - if single location: 'Shoreditch, London', if multiple: 'Multiple locations in London (Shoreditch, King's Cross) & Edinburgh'",
  "phone": "Main phone number if found",
  "chefName": "Head chef name if mentioned",
  "cuisine": "Standardized cuisine type (Italian/French/British/Modern European/Asian Fusion/etc)",
  "description": "2-3 sentence summary of the restaurant's concept and appeal",
  "dietaryOptions": "1-2 sentences about cooking style, ingredients, dietary accommodations",
  "priceRange": "$|$$|$$$|$$$$",
  "atmosphere": "1-2 sentences about ambiance and dining experience",
  "mustTryDishes": ["dish1", "dish2", "dish3"],
  "publicRating": null,
  "locations": [
    {
      "locationName": "Area/neighborhood name (e.g., 'Shoreditch', 'King's Cross')",
      "fullAddress": "Complete address with postcode if available",
      "city": "City name (e.g., 'London', 'Edinburgh')",
      "country": "Country name (e.g., 'United Kingdom', 'UK')",
      "phone": "Location-specific phone if different from main",
    }
  ]
}

GUIDELINES:
- Use standard cuisine categories, avoid made-up terms
- For price range: $ = casual/budget, $$ = mid-range, $$$ = upscale, $$$$ = fine dining
- Must-try dishes should come from menus or reviews, not generic items
- Be concise but descriptive
- Return null for fields you cannot determine
- LOCATIONS: Always include at least one location. If multiple locations found, include all with specific addresses
- ADDRESS SUMMARY: For single location, use neighborhood/area. For multiple, summarize all cities/areas
- IMPORTANT: Look specifically for ADDRESS:, PHONE:, and LOCATION_DETAIL: patterns in the content
- EXTRACT ADDRESSES: Use any street addresses, postcodes, or location details found in ADDRESS: or LOCATION_DETAIL: sections
- PHONE NUMBERS: Use specific phone numbers found in PHONE: sections for each location if available

${isInstagramUrl ? `
INSTAGRAM-SPECIFIC EXTRACTION GUIDANCE:
- Look for IG_ADDRESS, IG_CITY, IG_PHONE fields for structured business information
- Check INSTAGRAM_DATA fields for parsed business category and contact info
- Use FOOD_INDICATOR tags to understand cuisine type and specialties
- Instagram business profiles often have limited text, so infer from available bio content
- If address information is sparse, use neighborhood/area mentioned in bio or posts
- Extract restaurant concept from bio description and visible food posts
- Price range may need to be inferred from food types and presentation quality
- Must-try dishes can come from popular posts, hashtags, or bio highlights
- For atmosphere, consider the visual style and presentation in food photos
` : ''}

LOCATION EXTRACTION GUIDELINES:
- For single location restaurants, include one location object with all address details
- For multi-location restaurants, create separate objects for each location
- CRITICAL: city and country are MANDATORY fields - never leave them null or empty
- locationName should be the neighborhood/area (Shoreditch, Covent Garden, etc.)
- fullAddress should be the complete street address with postcode
- If multiple locations exist, ensure each has its own city/country even if the same
- For UK addresses, country should be "United Kingdom" (preferred) or "UK"
- If city is not explicitly mentioned, infer from address or neighborhood (e.g., Shoreditch -> London)
- Ensure locations array is always populated with at least one location
- NEVER return a location object without both city and country fields populated
`;

    const restaurantResponse = await callClaudeApi(restaurantPrompt, apiKey);
    console.log('🔍 Raw restaurant response:', restaurantResponse);
    
    // Check if Claude API returned an error
    if (restaurantResponse.isError) {
      // Handle rate limit specifically
      if (restaurantResponse.status === 429 || restaurantResponse.errorText.includes('rate_limit_error')) {
        return Response.json({
          success: false,
          error: 'Claude API rate limit reached. Please wait 2-3 minutes before trying again.',
          isRateLimited: true,
          retryAfter: 180 // 3 minutes in seconds
        }, { status: 429 });
      }
      
      // Handle other API errors
      return Response.json({
        success: false,
        error: 'Claude API is temporarily unavailable. Please try again later.',
        isApiError: true
      }, { status: 503 });
    }
    
    const restaurantData = extractJSONFromResponse(restaurantResponse);
    console.log('✅ Restaurant data extracted:', restaurantData);
    
    // Post-process to ensure city and country fields are populated
    if (restaurantData.locations && restaurantData.locations.length > 0) {
      restaurantData.locations = restaurantData.locations.map(location => ({
        ...location,
        city: location.city || inferCityFromLocation(location) || 'London',
        country: location.country || 'United Kingdom'
      }));
      console.log('✅ Restaurant data with processed locations:', restaurantData);
    }

    // Improve fallback for multi-location restaurants with poor address data
    if (restaurantData.locations && restaurantData.locations.length > 0) {
      // Check if we detected multiple locations but got poor address data
      const hasMultipleLocationIndicators = restaurantData.addressSummary && 
        (restaurantData.addressSummary.toLowerCase().includes('multiple') ||
         restaurantData.addressSummary.toLowerCase().includes('locations') ||
         restaurantData.addressSummary.split(',').length > 2); // Multiple cities mentioned
      
      const hasPoorLocationData = restaurantData.locations.some(loc => 
        loc.locationName === 'Multiple locations' || 
        !loc.fullAddress || 
        loc.fullAddress === null ||
        loc.fullAddress.trim() === ''
      );
      
      if (hasMultipleLocationIndicators && hasPoorLocationData) {
        console.log('🔄 Applying fallback for multi-location restaurant with poor address data');
        restaurantData.locations = [{
          locationName: 'Multiple locations',
          fullAddress: 'See the website',
          phone: null,
        }];
      }
    }

    // Add website URL
    restaurantData.website = url;

    return Response.json({
      success: true,
      data: restaurantData,
      confidence: 'high' // Simplified for now
    });

  } catch (error) {
    console.error('Extraction failed:', error);
    
    // Generic error (Claude API errors are now handled earlier)
    return Response.json({
      success: false,
      error: `Extraction failed: ${error.message}. Please try again or use manual entry.`
    }, { status: 500 });
  }
}

// Claude API proxy handler for review summarization
async function handleClaudeRequest(request, env) {
  try {
    const requestBody = await request.json();

    if (!env.CLAUDE_API_KEY) {
      return new Response(JSON.stringify({ error: 'Claude API key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('🤖 Proxying Claude API request for review summarization');

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    });

    const data = await claudeResponse.json();

    return new Response(JSON.stringify(data), {
      status: claudeResponse.status,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Claude API proxy error:', error);
    return new Response(JSON.stringify({
      error: 'Claude API request failed',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Google Maps API proxy handler
async function handleGoogleMapsRequest(request, env) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');
    const query = searchParams.get('query');
    const placeId = searchParams.get('place_id');

    if (!env.GOOGLE_MAPS_API_KEY) {
      return new Response(JSON.stringify({ error: 'Google Maps API key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let googleMapsUrl;

    if (endpoint === 'textsearch') {
      if (!query) {
        return new Response(JSON.stringify({ error: 'Query parameter required for text search' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      googleMapsUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${env.GOOGLE_MAPS_API_KEY}&fields=place_id,name,rating,user_ratings_total,formatted_address,geometry`;
    } else if (endpoint === 'geocode') {
      if (!query) {
        return new Response(JSON.stringify({ error: 'Query parameter required for geocoding' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Build geocoding URL
      googleMapsUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${env.GOOGLE_MAPS_API_KEY}`;

      // Add location bias if provided
      const location = searchParams.get('location');
      const radius = searchParams.get('radius');
      if (location && radius) {
        googleMapsUrl += `&location=${encodeURIComponent(location)}&radius=${encodeURIComponent(radius)}`;
      }
    } else if (endpoint === 'details') {
      if (!placeId) {
        return new Response(JSON.stringify({ error: 'place_id parameter required for details' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      googleMapsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&key=${env.GOOGLE_MAPS_API_KEY}&fields=place_id,name,rating,user_ratings_total,reviews,formatted_address,geometry`;
    } else {
      return new Response(JSON.stringify({ error: 'Invalid endpoint. Use textsearch, geocode, or details' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`🗺️ Proxying Google Maps API request: ${endpoint}`);

    const response = await fetch(googleMapsUrl);
    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Google Maps API proxy error:', error);
    return new Response(JSON.stringify({
      error: 'Google Maps API request failed',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Main Workers handler
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Log EVERY request to see if worker is being called at all
    console.log('WORKER ENTRY:', request.method, url.pathname, 'v2025-09-22-09:40-FORCE-BYPASS');

    // Force cache bypass for restaurant routes
    if (url.pathname.startsWith('/restaurant/')) {
      console.log('Restaurant route detected - FORCING CACHE BYPASS');
    }

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '3600',
        },
      });
    }

    // API routes
    if (url.pathname === '/api/extract-restaurant' && request.method === 'POST') {
      const response = await handleRestaurantExtraction(request, env);

      // Add CORS headers to API responses
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      };

      // Clone response to add headers
      const newResponse = new Response(response.body, {
        status: response.status,
        headers: { ...Object.fromEntries(response.headers), ...corsHeaders }
      });

      return newResponse;
    }

    // Claude API proxy route for review summarization
    if (url.pathname === '/api/claude' && request.method === 'POST') {
      const response = await handleClaudeRequest(request, env);

      // Add CORS headers to API responses
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      };

      // Clone response to add headers
      const newResponse = new Response(response.body, {
        status: response.status,
        headers: { ...Object.fromEntries(response.headers), ...corsHeaders }
      });

      return newResponse;
    }

    // Google Maps API proxy route
    if (url.pathname === '/api/google-maps' && request.method === 'GET') {
      const response = await handleGoogleMapsRequest(request, env);

      // Add CORS headers to API responses
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      };

      // Clone response to add headers
      const newResponse = new Response(response.body, {
        status: response.status,
        headers: { ...Object.fromEntries(response.headers), ...corsHeaders }
      });

      return newResponse;
    }
    
    // Check if we're in development mode (localhost)
    const isDevelopment = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname.endsWith('.local');

    console.log('Non-API request:', url.pathname, isDevelopment ? 'DEV-MODE' : 'PROD-MODE', 'v2025-09-26-09:30-ENV-AWARE');

    if (isDevelopment) {
      // Development mode: Let Vite handle everything
      console.log('🔧 Development mode - passing through to Vite for:', url.pathname);
      return fetch(request);
    }

    // Production mode: Check if this is an asset request that should be handled by CloudFlare
    if (url.pathname.startsWith('/assets/')) {
      console.log('📁 Asset request in production - should be handled by CloudFlare:', url.pathname);
      // This shouldn't happen in production as assets are served directly by CloudFlare
      // But if it does, return a 404 to indicate the asset wasn't found
      return new Response('Asset not found', { status: 404 });
    }

    // Production SPA routes: serve the built index.html content
    // NOTE: Asset references are automatically updated by build script
    const indexHtmlContent = `<!doctype html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Wandering Paths - Magnus' Restaurant Hitlist</title>
        <meta
            name="description"
            content="It started with a Lovable prompt...and ended with a restaurant hitlist, a curated list of must visit restaurants."
        />
        <meta name="author" content="Claude and Magnus" />

        <meta
            property="og:title"
            content="Wandering Paths - Magnus' Restaurant Hitlist"
        />
        <meta
            property="og:description"
            content="It started with a Lovable prompt...and ended with a restaurant hitlist, a curated list of must visit restaurants."
        />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="" />
      <!-- ASSET_PLACEHOLDER_SCRIPT -->
      <!-- ASSET_PLACEHOLDER_CSS -->
    </head>

    <body>
        <div id="root"></div>
    </body>
</html>`;

    console.log('✅ Serving embedded index.html for SPA route:', url.pathname);

    return new Response(indexHtmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate, private',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Worker-Version': 'v2025-09-26-09:30-ENV-AWARE',
        'X-SPA-Route': url.pathname
      }
    });
  }
};