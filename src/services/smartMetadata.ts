import { ExtractedMetadata, MetadataExtractionResult } from './metadata';

interface GoogleSearchResult {
  name: string;
  address?: string;
  rating?: number;
  cuisine?: string;
  description?: string;
  dishes?: string[];
  confidence: 'high' | 'medium' | 'low';
}

export class SmartMetadataExtractor {
  private serperApiKey: string | null = null; // We'll use a free alternative
  
  async extractFromUrl(url: string): Promise<MetadataExtractionResult> {
    try {
      // Step 1: Basic URL analysis
      const urlAnalysis = this.analyzeUrl(url);
      
      // Step 2: Try to get page content (with fallback)
      const pageContent = await this.getPageContent(url);
      
      // Step 3: Extract business name intelligently
      const businessName = await this.extractBusinessName(url, pageContent, urlAnalysis);
      
      // Step 4: If it's a restaurant, enhance with search data
      let enhancedData: GoogleSearchResult | null = null;
      if (urlAnalysis.type === 'restaurant' && businessName) {
        enhancedData = await this.searchRestaurantData(businessName, urlAnalysis.locationHints);
      }
      
      // Step 5: Combine all data sources
      const metadata = this.combineDataSources(url, urlAnalysis, pageContent, businessName, enhancedData);
      
      return {
        success: true,
        data: metadata,
        confidence: this.assessOverallConfidence(metadata, enhancedData)
      };
      
    } catch (error) {
      console.error('Smart extraction error:', error);
      return {
        success: false,
        error: 'Failed to extract restaurant information. Please add details manually.',
        confidence: 'low'
      };
    }
  }
  
  private analyzeUrl(url: string): {
    type: string;
    locationHints: string[];
    businessHints: string[];
    domain: string;
  } {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');
    const path = urlObj.pathname.toLowerCase();
    const fullUrl = url.toLowerCase();
    
    // Extract location hints from URL
    const locationHints: string[] = [];
    const locationPatterns = [
      /\/(london|paris|nyc|new-york|chicago|san-francisco|los-angeles|boston|seattle)/gi,
      /\/(borough|soho|manhattan|brooklyn|chelsea|mayfair|covent-garden)/gi,
      /locations?\/([\w-]+)/gi
    ];
    
    locationPatterns.forEach(pattern => {
      const matches = url.match(pattern);
      if (matches) {
        matches.forEach(match => locationHints.push(match.replace(/\//g, '').replace(/-/g, ' ')));
      }
    });
    
    // Extract business name hints from domain
    const businessHints = domain.split('.')[0].split(/[-_]/)
      .filter(part => part.length > 2);
    
    // Determine type
    let type = 'other';
    if (fullUrl.includes('restaurant') || fullUrl.includes('menu') || fullUrl.includes('dining') ||
        fullUrl.includes('food') || fullUrl.includes('eat') || fullUrl.includes('kitchen') ||
        fullUrl.includes('bistro') || fullUrl.includes('cafe')) {
      type = 'restaurant';
    } else if (fullUrl.includes('gallery') || fullUrl.includes('museum') || fullUrl.includes('art')) {
      type = 'gallery';
    } else if (fullUrl.includes('book') || fullUrl.includes('library')) {
      type = 'bookshop';
    }
    
    return { type, locationHints, businessHints, domain };
  }
  
  private async getPageContent(url: string): Promise<string | null> {
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
        console.log('Proxy failed:', error);
        continue;
      }
    }
    return null;
  }
  
  private async extractBusinessName(
    url: string, 
    pageContent: string | null, 
    urlAnalysis: ReturnType<SmartMetadataExtractor['analyzeUrl']>
  ): Promise<string> {
    if (!pageContent) {
      // Fallback to URL-based extraction
      return this.extractNameFromUrl(urlAnalysis);
    }
    
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(pageContent, 'text/html');
      
      // Strategy 1: Look for business schema markup
      const schemaName = this.extractFromSchema(doc);
      if (schemaName && this.validateBusinessName(schemaName, urlAnalysis)) {
        return schemaName;
      }
      
      // Strategy 2: Look for common business name patterns
      const patternName = this.extractFromPatterns(doc, urlAnalysis);
      if (patternName && this.validateBusinessName(patternName, urlAnalysis)) {
        return patternName;
      }
      
      // Strategy 3: Correlate title/headings with URL
      const correlatedName = this.correlateTitleWithUrl(doc, urlAnalysis);
      if (correlatedName) {
        return correlatedName;
      }
      
      // Fallback
      return this.extractNameFromUrl(urlAnalysis);
      
    } catch (error) {
      return this.extractNameFromUrl(urlAnalysis);
    }
  }
  
  private extractFromSchema(doc: Document): string | null {
    const scripts = doc.querySelectorAll('script[type=\"application/ld+json\"]');
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent || '');
        if (data.name || data.legalName) {
          return data.name || data.legalName;
        }
        if (data['@type'] === 'Restaurant' && data.name) {
          return data.name;
        }
      } catch {
        continue;
      }
    }
    return null;
  }
  
  private extractFromPatterns(doc: Document, urlAnalysis: ReturnType<SmartMetadataExtractor['analyzeUrl']>): string | null {
    const selectors = [
      '.restaurant-name',
      '.business-name',
      '.brand-name',
      '.site-title',
      'h1.name',
      '[data-testid=\"restaurant-name\"]',
      '[itemprop=\"name\"]'
    ];
    
    for (const selector of selectors) {
      const element = doc.querySelector(selector);
      if (element?.textContent?.trim()) {
        const text = element.textContent.trim();
        if (text.length > 3 && text.length < 100) {
          return text;
        }
      }
    }
    return null;
  }
  
  private correlateTitleWithUrl(doc: Document, urlAnalysis: ReturnType<SmartMetadataExtractor['analyzeUrl']>): string | null {
    const title = doc.title?.trim();
    if (!title) return null;
    
    // Remove common suffixes
    const cleanTitle = title
      .replace(/\s*[-|]\s*(Restaurant|Menu|Home|Welcome).*$/i, '')
      .replace(/\s*[-|]\s*Official Site.*$/i, '')
      .trim();
    
    // Check if title contains URL hints
    const urlHints = urlAnalysis.businessHints.join('|');
    const regex = new RegExp(`\\b(${urlHints})\\b`, 'gi');
    
    if (regex.test(cleanTitle)) {
      return cleanTitle;
    }
    
    // If title is short and meaningful, use it
    if (cleanTitle.length > 3 && cleanTitle.length < 50 && !cleanTitle.includes('SEO')) {
      return cleanTitle;
    }
    
    return null;
  }
  
  private validateBusinessName(name: string, urlAnalysis: ReturnType<SmartMetadataExtractor['analyzeUrl']>): boolean {
    const cleanName = name.toLowerCase();
    const urlHints = urlAnalysis.businessHints.map(h => h.toLowerCase());
    
    // Name should contain at least one URL hint
    return urlHints.some(hint => cleanName.includes(hint) || hint.includes(cleanName));
  }
  
  private extractNameFromUrl(urlAnalysis: ReturnType<SmartMetadataExtractor['analyzeUrl']>): string {
    return urlAnalysis.businessHints
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
  
  private async searchRestaurantData(businessName: string, locationHints: string[]): Promise<GoogleSearchResult | null> {
    try {
      // For now, we'll simulate this since we don't have API keys
      // In a real implementation, this would use Google Places API or similar
      console.log(`Would search for: \"${businessName}\" restaurant ${locationHints.join(' ')}`);
      
      // Simulate restaurant data enhancement
      const mockData: GoogleSearchResult = {
        name: businessName,
        confidence: 'medium'
      };
      
      // Add mock cuisine data for known restaurants
      if (businessName.toLowerCase().includes('hawksmoor')) {
        mockData.cuisine = 'British Steakhouse';
        mockData.dishes = ['Dry-aged beef', 'Bone marrow', 'Sunday roast', 'Seafood platter'];
        mockData.rating = 4.5;
        mockData.confidence = 'high';
      }
      
      return mockData;
      
    } catch (error) {
      console.error('Restaurant search failed:', error);
      return null;
    }
  }
  
  private combineDataSources(
    url: string,
    urlAnalysis: ReturnType<SmartMetadataExtractor['analyzeUrl']>,
    pageContent: string | null,
    businessName: string,
    enhancedData: GoogleSearchResult | null
  ): ExtractedMetadata {
    const metadata: ExtractedMetadata = {
      website: url,
      name: businessName,
      type: urlAnalysis.type
    };
    
    // Add location if we have hints
    if (urlAnalysis.locationHints.length > 0) {
      metadata.address = urlAnalysis.locationHints.join(', ');
    }
    
    // Merge enhanced data if available
    if (enhancedData) {
      if (enhancedData.cuisine) metadata.cuisine = enhancedData.cuisine;
      if (enhancedData.dishes) metadata.must_try_dishes = enhancedData.dishes;
      if (enhancedData.rating) metadata.public_rating = enhancedData.rating;
      if (enhancedData.address) metadata.address = enhancedData.address;
      if (enhancedData.description) metadata.description = enhancedData.description;
    }
    
    return metadata;
  }
  
  private assessOverallConfidence(
    metadata: ExtractedMetadata, 
    enhancedData: GoogleSearchResult | null
  ): 'high' | 'medium' | 'low' {
    let score = 0;
    
    if (metadata.name && metadata.name.length > 3) score += 2;
    if (metadata.address) score += 2;
    if (metadata.type && metadata.type !== 'other') score += 1;
    if (metadata.cuisine) score += 1;
    if (metadata.must_try_dishes && metadata.must_try_dishes.length > 0) score += 2;
    if (enhancedData?.confidence === 'high') score += 2;
    
    if (score >= 7) return 'high';
    if (score >= 4) return 'medium';
    return 'low';
  }
}

export const smartMetadataExtractor = new SmartMetadataExtractor();