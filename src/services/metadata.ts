export interface ExtractedMetadata {
  name?: string;
  address?: string;
  type?: string;
  website: string;
  public_rating?: number;
  cuisine?: string;
  must_try_dishes?: string[];
  description?: string;
  // Raw HTML for manual parsing fallback
  rawHtml?: string;
}

export interface MetadataExtractionResult {
  success: boolean;
  data?: ExtractedMetadata;
  error?: string;
  confidence: 'high' | 'medium' | 'low';
}

class MetadataExtractor {
  private corsProxies = [
    'https://api.codetabs.com/v1/proxy?quest=',
    'https://cors-anywhere.herokuapp.com/',
    'https://api.allorigins.win/get?url=',
    'https://corsproxy.io/?'
  ];
  
  async extractFromUrl(url: string): Promise<MetadataExtractionResult> {
    try {
      // Validate URL
      const validatedUrl = this.validateAndCleanUrl(url);
      if (!validatedUrl) {
        return {
          success: false,
          error: 'Invalid URL format',
          confidence: 'low'
        };
      }

      // Try different approaches to get the content
      let html: string | null = null;
      const lastError: string = '';

      // First, try to extract from the URL directly (for basic metadata)
      html = await this.tryDirectExtraction(validatedUrl);
      
      if (!html) {
        // If direct extraction fails, try CORS proxies
        html = await this.tryProxyExtraction(validatedUrl);
      }
      
      if (!html) {
        // As a fallback, create basic metadata from URL structure
        return this.createFallbackMetadata(validatedUrl);
      }

      // Extract metadata from HTML
      const metadata = this.parseHtmlMetadata(html, validatedUrl);
      
      return {
        success: true,
        data: metadata,
        confidence: this.assessConfidence(metadata)
      };

    } catch (error) {
      console.error('Metadata extraction error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error - please try a different URL or add place details manually',
        confidence: 'low'
      };
    }
  }

  private async tryDirectExtraction(url: string): Promise<string | null> {
    try {
      // This will fail due to CORS, but we can extract some info from the URL itself
      const urlObj = new URL(url);
      return null; // We'll handle this in fallback
    } catch {
      return null;
    }
  }

  private async tryProxyExtraction(url: string): Promise<string | null> {
    for (const proxy of this.corsProxies) {
      try {
        console.log(`Trying proxy: ${proxy}`);
        
        let response;
        if (proxy.includes('allorigins.win')) {
          response = await fetch(`${proxy}${encodeURIComponent(url)}`);
          if (response.ok) {
            const data = await response.json();
            return data.contents;
          }
        } else if (proxy.includes('codetabs.com')) {
          response = await fetch(`${proxy}${encodeURIComponent(url)}`);
          if (response.ok) {
            return await response.text();
          }
        } else {
          response = await fetch(`${proxy}${url}`);
          if (response.ok) {
            return await response.text();
          }
        }
      } catch (error) {
        console.log(`Proxy ${proxy} failed:`, error);
        continue;
      }
    }
    return null;
  }

  private createFallbackMetadata(url: string): MetadataExtractionResult {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace('www.', '');
      
      // Extract potential business name from domain
      const domainParts = domain.split('.');
      const businessName = domainParts[0]
        .split(/[-_]/)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
      
      // Infer type from URL patterns
      const urlLower = url.toLowerCase();
      let type = 'other';
      
      if (urlLower.includes('restaurant') || urlLower.includes('menu') || urlLower.includes('dining')) {
        type = 'restaurant';
      } else if (urlLower.includes('gallery') || urlLower.includes('museum') || urlLower.includes('art')) {
        type = 'gallery';
      } else if (urlLower.includes('book') || urlLower.includes('library')) {
        type = 'bookshop';
      }

      return {
        success: true,
        data: {
          name: businessName,
          website: url,
          type: type,
          address: '', // User will need to fill this
        },
        confidence: 'low'
      };
    } catch {
      return {
        success: false,
        error: 'Could not extract any information from URL. Please add place details manually.',
        confidence: 'low'
      };
    }
  }

  private validateAndCleanUrl(url: string): string | null {
    try {
      // Add protocol if missing
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      
      const urlObj = new URL(url);
      return urlObj.toString();
    } catch {
      return null;
    }
  }

  private parseHtmlMetadata(html: string, url: string): ExtractedMetadata {
    // Create a temporary DOM element to parse HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const metadata: ExtractedMetadata = {
      website: url,
      rawHtml: html
    };

    // Extract basic metadata
    metadata.name = this.extractTitle(doc);
    metadata.description = this.extractDescription(doc);
    metadata.address = this.extractAddress(doc);
    metadata.type = this.inferPlaceType(url, html);
    
    // Extract restaurant-specific data if applicable
    if (metadata.type === 'restaurant') {
      const restaurantData = this.extractRestaurantData(doc, html);
      metadata.cuisine = restaurantData.cuisine;
      metadata.must_try_dishes = restaurantData.dishes;
      metadata.public_rating = restaurantData.rating;
    } else {
      // Try to extract rating for other types
      metadata.public_rating = this.extractRating(doc, html);
    }

    return metadata;
  }

  private extractTitle(doc: Document): string | undefined {
    // Try multiple selectors for title
    const selectors = [
      'meta[property=\"og:title\"]',
      'meta[name=\"twitter:title\"]',
      'title',
      'h1',
      '.restaurant-name',
      '.venue-name',
      '.business-name'
    ];

    for (const selector of selectors) {
      const element = doc.querySelector(selector);
      if (element) {
        const content = element.getAttribute('content') || element.textContent;
        if (content?.trim()) {
          return content.trim();
        }
      }
    }

    return undefined;
  }

  private extractDescription(doc: Document): string | undefined {
    const selectors = [
      'meta[property=\"og:description\"]',
      'meta[name=\"twitter:description\"]',
      'meta[name=\"description\"]',
      '.description',
      '.about',
      '.restaurant-description'
    ];

    for (const selector of selectors) {
      const element = doc.querySelector(selector);
      if (element) {
        const content = element.getAttribute('content') || element.textContent;
        if (content?.trim() && content.length > 20) {
          return content.trim().substring(0, 500); // Limit description length
        }
      }
    }

    return undefined;
  }

  private extractAddress(doc: Document): string | undefined {
    const selectors = [
      '[itemtype*=\"PostalAddress\"]',
      '.address',
      '.location',
      '.venue-address',
      '.restaurant-address',
      '[data-testid=\"address\"]'
    ];

    for (const selector of selectors) {
      const element = doc.querySelector(selector);
      if (element?.textContent?.trim()) {
        return element.textContent.trim();
      }
    }

    // Look for JSON-LD structured data
    const scripts = doc.querySelectorAll('script[type=\"application/ld+json\"]');
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent || '');
        if (data.address) {
          if (typeof data.address === 'string') return data.address;
          if (data.address.streetAddress) {
            return `${data.address.streetAddress}, ${data.address.addressLocality || ''}, ${data.address.addressCountry || ''}`.trim();
          }
        }
      } catch {
        continue;
      }
    }

    return undefined;
  }

  private extractRating(doc: Document, html: string): number | undefined {
    // Look for common rating patterns
    const ratingPatterns = [
      /rating["']?\s*:\s*["']?(\d+(?:\.\d+)?)/i,
      /score["']?\s*:\s*["']?(\d+(?:\.\d+)?)/i,
      /\b(\d\.\d)\s*\/\s*5/g,
      /\b(\d)\s*\/\s*5\s*stars?/gi
    ];

    for (const pattern of ratingPatterns) {
      const matches = html.match(pattern);
      if (matches && matches[1]) {
        const rating = parseFloat(matches[1]);
        if (rating >= 1 && rating <= 5) {
          return Math.round(rating * 10) / 10; // Round to 1 decimal place
        }
      }
    }

    return undefined;
  }

  private inferPlaceType(url: string, html: string): string {
    const urlLower = url.toLowerCase();
    const htmlLower = html.toLowerCase();

    // Restaurant indicators
    if (
      urlLower.includes('restaurant') ||
      urlLower.includes('menu') ||
      urlLower.includes('dining') ||
      htmlLower.includes('restaurant') ||
      htmlLower.includes('cuisine') ||
      htmlLower.includes('menu') ||
      htmlLower.includes('reservation')
    ) {
      return 'restaurant';
    }

    // Gallery/Museum indicators
    if (
      urlLower.includes('museum') ||
      urlLower.includes('gallery') ||
      urlLower.includes('art') ||
      htmlLower.includes('exhibition') ||
      htmlLower.includes('gallery') ||
      htmlLower.includes('museum')
    ) {
      return 'gallery';
    }

    // Bookshop indicators
    if (
      urlLower.includes('book') ||
      urlLower.includes('library') ||
      htmlLower.includes('bookstore') ||
      htmlLower.includes('bookshop') ||
      htmlLower.includes('library')
    ) {
      return 'bookshop';
    }

    return 'other';
  }

  private extractRestaurantData(doc: Document, html: string): {
    cuisine?: string;
    dishes?: string[];
    rating?: number;
  } {
    const result: { cuisine?: string; dishes?: string[]; rating?: number } = {};

    // Extract cuisine
    const cuisinePatterns = [
      /cuisine["']?\s*:\s*["']([^"']+)["']/i,
      /food[\s-]?type["']?\s*:\s*["']([^"']+)["']/i
    ];

    for (const pattern of cuisinePatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        result.cuisine = match[1].trim();
        break;
      }
    }

    // Look for common cuisine keywords
    const cuisineKeywords = [
      'italian', 'french', 'chinese', 'japanese', 'mexican', 'indian',
      'thai', 'mediterranean', 'american', 'british', 'korean', 'vietnamese',
      'greek', 'spanish', 'turkish', 'lebanese', 'moroccan', 'nordic'
    ];

    if (!result.cuisine) {
      for (const keyword of cuisineKeywords) {
        if (html.toLowerCase().includes(keyword + ' cuisine') || 
            html.toLowerCase().includes(keyword + ' restaurant')) {
          result.cuisine = keyword.charAt(0).toUpperCase() + keyword.slice(1);
          break;
        }
      }
    }

    // Extract popular dishes (this is basic - could be improved)
    const dishSelectors = [
      '.menu-item',
      '.dish',
      '.popular-dish',
      '.signature-dish',
      '.specialty'
    ];

    const dishes: string[] = [];
    for (const selector of dishSelectors) {
      const elements = doc.querySelectorAll(selector);
      for (const element of elements) {
        const dish = element.textContent?.trim();
        if (dish && dish.length > 3 && dish.length < 50) {
          dishes.push(dish);
        }
      }
    }

    if (dishes.length > 0) {
      result.dishes = dishes.slice(0, 5); // Limit to 5 dishes
    }

    // Extract rating
    result.rating = this.extractRating(doc, html);

    return result;
  }

  private assessConfidence(metadata: ExtractedMetadata): 'high' | 'medium' | 'low' {
    let score = 0;
    
    if (metadata.name) score += 2;
    if (metadata.address) score += 2;
    if (metadata.type && metadata.type !== 'other') score += 1;
    if (metadata.public_rating) score += 1;
    if (metadata.description) score += 1;

    if (score >= 5) return 'high';
    if (score >= 3) return 'medium';
    return 'low';
  }
}

export const metadataExtractor = new MetadataExtractor();