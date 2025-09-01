// ABOUT: Claude API integration for intelligent restaurant data extraction
// ABOUT: Handles business type detection, restaurant analysis, and review summarization

export interface ExtractionProgress {
  step: string;
  details?: string;
}

export interface RestaurantExtractionResult {
  success: boolean;
  isNotRestaurant?: boolean;
  detectedType?: string;
  message?: string;
  data?: ExtractedRestaurantData;
  confidence?: 'high' | 'medium' | 'low';
  error?: string;
}

export interface ExtractedLocation {
  locationName: string; // "Shoreditch", "King's Cross"
  fullAddress: string; // "7 Boundary St, Shoreditch, London E2 7JE"
  phone?: string;
  openingHours?: string;
}

export interface ExtractedRestaurantData {
  name: string;
  addressSummary: string; // "Shoreditch, London" or "Multiple locations in London & Edinburgh"
  phone?: string; // Main/first phone if single location
  website: string;
  chefName?: string;
  cuisine?: string;
  description?: string;
  dietaryOptions?: string;
  publicRating?: number;
  reviewSummary?: string;
  priceRange?: '$' | '$$' | '$$$' | '$$$$';
  atmosphere?: string;
  mustTryDishes?: string[];
  locations: ExtractedLocation[]; // All specific locations
}

export interface CrawledContent {
  mainPage?: string;
  menuPages?: string[];
  contactPage?: string;
  aboutPage?: string;
  googleMapsData?: any;
}

export class ClaudeExtractor {
  private apiKey: string;
  private baseUrl = 'https://api.anthropic.com/v1/messages';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async extractFromUrl(
    url: string, 
    progressCallback?: (progress: ExtractionProgress) => void
  ): Promise<RestaurantExtractionResult> {
    try {
      // Phase 1: Crawl content
      progressCallback?.({ step: 'Fetching website content...' });
      const content = await this.crawlWebsiteContent(url);
      
      // Phase 2: Business type detection
      progressCallback?.({ step: 'Analyzing business type...' });
      const businessAnalysis = await this.analyzeBusinessType(content);
      
      if (businessAnalysis.businessType !== 'restaurant') {
        return {
          success: false,
          isNotRestaurant: true,
          detectedType: businessAnalysis.businessType,
          message: `This appears to be a ${businessAnalysis.businessType} website, not a restaurant. Please use manual entry instead.`
        };
      }
      
      // Phase 3: Restaurant-specific extraction
      progressCallback?.({ step: 'Extracting restaurant details...' });
      const restaurantData = await this.extractRestaurantData(content, url);
      
      // Phase 4: Review enhancement (if available)
      progressCallback?.({ step: 'Enhancing with review data...' });
      const enhanced = await this.enhanceWithReviews(restaurantData);
      
      progressCallback?.({ step: 'Extraction complete!' });
      
      return {
        success: true,
        data: enhanced,
        confidence: this.calculateConfidence(enhanced)
      };
      
    } catch (error) {
      console.error('Claude extraction failed:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        url: url
      });
      return {
        success: false,
        error: `Extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or use manual entry.`,
      };
    }
  }

  private async crawlWebsiteContent(url: string): Promise<CrawledContent> {
    // Use existing intelligent crawler or create simplified version
    const content: CrawledContent = {};
    
    try {
      // Fetch main page
      content.mainPage = await this.fetchPage(url);
      
      if (content.mainPage) {
        // Look for relevant subpages
        const relevantLinks = this.findRelevantLinks(url, content.mainPage);
        
        // Fetch menu pages
        const menuLinks = relevantLinks.filter(link => 
          /menu|food|chef|about/i.test(link.text + link.url)
        );
        if (menuLinks.length > 0) {
          content.menuPages = await Promise.all(
            menuLinks.slice(0, 3).map(link => this.fetchPage(link.url))
          );
        }
        
        // Fetch contact page
        const contactLink = relevantLinks.find(link =>
          /contact|location|find.*us|reservations/i.test(link.text + link.url)
        );
        if (contactLink) {
          content.contactPage = await this.fetchPage(contactLink.url);
        }
      }
    } catch (error) {
      console.warn('Content crawling partially failed:', error);
    }
    
    return content;
  }

  private async fetchPage(url: string): Promise<string | null> {
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

  private findRelevantLinks(baseUrl: string, html: string): Array<{url: string, text: string}> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const links: Array<{url: string, text: string}> = [];
    
    const anchorElements = doc.querySelectorAll('a[href]');
    anchorElements.forEach(anchor => {
      const href = anchor.getAttribute('href');
      const text = anchor.textContent?.trim() || '';
      
      if (href && text) {
        try {
          const fullUrl = new URL(href, baseUrl).toString();
          // Only internal links
          if (fullUrl.includes(new URL(baseUrl).hostname)) {
            links.push({ url: fullUrl, text });
          }
        } catch (e) {
          // Skip invalid URLs
        }
      }
    });
    
    return links;
  }

  private async analyzeBusinessType(content: CrawledContent): Promise<{
    businessType: string;
    confidence: string;
    reasoning: string;
  }> {
    const allContent = this.combineContent(content);
    
    const prompt = `
Analyze this website content and determine if this is a restaurant business.

CONTENT:
<website_content>
${allContent.slice(0, 8000)} // Truncate for token limits
</website_content>

ANALYSIS REQUIRED:
1. Is this primarily a restaurant/dining establishment?
2. If not, what type of business is it?

Return JSON in this format:
{
  "businessType": "restaurant|hotel|retail|gallery|bookshop|service|other",
  "confidence": "high|medium|low", 
  "reasoning": "Brief explanation of your determination"
}

BUSINESS TYPE DEFINITIONS:
- restaurant: Primarily serves food/drinks for dine-in
- hotel: Accommodation with possible restaurant component
- retail: Sells products/goods
- gallery: Art gallery or museum
- bookshop: Bookstore or library
- service: Professional services, consulting, etc.
- other: Doesn't fit clear categories

IMPORTANT: If you find a hotel or venue with a restaurant component, classify as "restaurant" only if the restaurant is the primary business focus.
`;

    const response = await this.callClaudeApi(prompt);
    return JSON.parse(response);
  }

  private async extractRestaurantData(content: CrawledContent, url: string): Promise<ExtractedRestaurantData> {
    const allContent = this.combineContent(content);
    
    const prompt = `
Analyze this restaurant website content and extract structured information:

CONTENT TO ANALYZE:
${allContent.slice(0, 15000)} // Larger limit for restaurant analysis

EXTRACT THE FOLLOWING and return as JSON:
{
  "name": "Official restaurant name",
  "address": "Full address if found",
  "phone": "Phone number if found", 
  "chefName": "Head chef name if mentioned",
  "cuisine": "Standardized cuisine type (Italian/French/British/Modern European/Asian Fusion/etc)",
  "description": "2-3 sentence summary of the restaurant's concept and appeal",
  "dietaryOptions": "1-2 sentences about cooking style, ingredients, dietary accommodations",
  "priceRange": "$|$$|$$$|$$$$",
  "atmosphere": "1-2 sentences about ambiance and dining experience", 
  "bookingRequired": true/false,
  "mustTryDishes": ["dish1", "dish2", "dish3"],
  "publicRating": null // We'll get this from Google Maps later
}

GUIDELINES:
- Use standard cuisine categories, avoid made-up terms
- For price range: $ = casual/budget, $$ = mid-range, $$$ = upscale, $$$$ = fine dining
- Must-try dishes should come from menus or reviews, not generic items
- Be concise but descriptive
- Return null for fields you cannot determine
`;

    const response = await this.callClaudeApi(prompt);
    const data = JSON.parse(response);
    
    return {
      ...data,
      website: url
    };
  }

  private async enhanceWithReviews(restaurantData: ExtractedRestaurantData): Promise<ExtractedRestaurantData> {
    // For now, return as-is. We can add Google Reviews integration later
    return restaurantData;
  }

  private combineContent(content: CrawledContent): string {
    const parts = [
      content.mainPage,
      ...(content.menuPages || []),
      content.contactPage,
      content.aboutPage
    ].filter(Boolean);
    
    return parts.join('\n\n---PAGE BREAK---\n\n');
  }

  private async callClaudeApi(prompt: string): Promise<string> {
    console.log('🔍 Making Claude API call...');
    console.log('API Key present:', !!this.apiKey);
    console.log('Prompt length:', prompt.length);
    
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    console.log('Claude API Response Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API Error Response:', errorText);
      throw new Error(`Claude API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    console.log('Claude API Success - Response length:', JSON.stringify(result).length);
    return result.content[0].text;
  }

  private calculateConfidence(data: ExtractedRestaurantData): 'high' | 'medium' | 'low' {
    let score = 0;
    
    if (data.name && data.name !== 'Unknown') score += 2;
    if (data.address) score += 2; 
    if (data.cuisine) score += 1;
    if (data.description && data.description.length > 20) score += 1;
    if (data.mustTryDishes && data.mustTryDishes.length > 0) score += 1;
    if (data.priceRange) score += 1;
    
    if (score >= 6) return 'high';
    if (score >= 4) return 'medium';
    return 'low';
  }
}

// Cache management for development
export class ExtractionCache {
  private static CACHE_KEY = 'wandering-paths-extraction-cache';
  private static CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  static get(url: string): ExtractedRestaurantData | null {
    try {
      const cache = localStorage.getItem(this.CACHE_KEY);
      if (!cache) return null;

      const parsed = JSON.parse(cache);
      const urlHash = btoa(url).slice(0, 32);
      const cached = parsed[urlHash];

      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return cached.data;
      }
    } catch (error) {
      console.warn('Cache read failed:', error);
    }
    return null;
  }

  static set(url: string, data: ExtractedRestaurantData): void {
    try {
      const cache = localStorage.getItem(this.CACHE_KEY) || '{}';
      const parsed = JSON.parse(cache);
      const urlHash = btoa(url).slice(0, 32);

      parsed[urlHash] = {
        data,
        timestamp: Date.now()
      };

      localStorage.setItem(this.CACHE_KEY, JSON.stringify(parsed));
    } catch (error) {
      console.warn('Cache write failed:', error);
    }
  }

  static clear(): void {
    try {
      localStorage.removeItem(this.CACHE_KEY);
      console.log('✅ Extraction cache cleared');
    } catch (error) {
      console.warn('Cache clear failed:', error);
    }
  }

  static getStats(): { totalEntries: number; oldestEntry?: Date; newestEntry?: Date } {
    try {
      const cache = localStorage.getItem(this.CACHE_KEY);
      if (!cache) return { totalEntries: 0 };

      const parsed = JSON.parse(cache);
      const entries = Object.values(parsed) as Array<{ timestamp: number }>;
      
      if (entries.length === 0) return { totalEntries: 0 };

      const timestamps = entries.map(e => e.timestamp);
      return {
        totalEntries: entries.length,
        oldestEntry: new Date(Math.min(...timestamps)),
        newestEntry: new Date(Math.max(...timestamps))
      };
    } catch (error) {
      console.warn('Cache stats failed:', error);
      return { totalEntries: 0 };
    }
  }
}