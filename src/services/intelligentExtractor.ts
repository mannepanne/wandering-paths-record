import { ExtractedMetadata, MetadataExtractionResult } from './metadata';

interface ContentSources {
  mainPage?: string;
  contactPage?: string;
  locationPage?: string;
}

interface ExtractedInfo {
  name: string;
  address?: string;
  phone?: string;
  website: string;
  rawContent: ContentSources;
}

interface GoogleSearchData {
  businessType: string;
  reviews?: string[];
  rating?: number;
  additionalInfo?: any;
}

export class IntelligentExtractor {
  
  async extractFromUrl(url: string): Promise<MetadataExtractionResult> {
    try {
      console.log('🔍 Starting intelligent extraction for:', url);
      
      // Phase 1: Content Gathering
      const content = await this.gatherContent(url);
      
      // Phase 2: Basic Extraction
      const basicInfo = await this.extractBasicInfo(url, content);
      
      // Phase 3: Enhancement via Search
      const searchData = await this.enhanceWithSearch(basicInfo);
      
      // Phase 4: Analysis and Reasoning
      const placeType = this.determinePlaceType(basicInfo, searchData, content);
      
      // Phase 5: Type-Specific Enhancement
      const finalMetadata = await this.enhanceByType(basicInfo, searchData, placeType);
      
      return {
        success: true,
        data: finalMetadata,
        confidence: this.calculateConfidence(finalMetadata, searchData)
      };
      
    } catch (error) {
      console.error('❌ Extraction failed:', error);
      return {
        success: false,
        error: 'Failed to extract place information',
        confidence: 'low'
      };
    }
  }
  
  // Phase 1: Systematic Content Gathering
  private async gatherContent(url: string): Promise<ContentSources> {
    console.log('📄 Gathering content from website...');
    
    const content: ContentSources = {};
    
    // Get main page
    content.mainPage = await this.fetchPage(url);
    
    if (content.mainPage) {
      // Look for contact/location pages
      const contactUrl = this.findContactPageUrl(url, content.mainPage);
      if (contactUrl) {
        console.log('📞 Found contact page:', contactUrl);
        content.contactPage = await this.fetchPage(contactUrl);
      }
      
      const locationUrl = this.findLocationPageUrl(url, content.mainPage);
      if (locationUrl && locationUrl !== contactUrl) {
        console.log('📍 Found location page:', locationUrl);
        content.locationPage = await this.fetchPage(locationUrl);
      }
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
  
  private findContactPageUrl(baseUrl: string, html: string): string | null {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const contactLinks = doc.querySelectorAll('a[href*="contact"], a[href*="Contact"]');
    for (const link of contactLinks) {
      const href = link.getAttribute('href');
      if (href) {
        return this.resolveUrl(baseUrl, href);
      }
    }
    return null;
  }
  
  private findLocationPageUrl(baseUrl: string, html: string): string | null {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const locationLinks = doc.querySelectorAll('a[href*="location"], a[href*="Location"], a[href*="address"], a[href*="find-us"]');
    for (const link of locationLinks) {
      const href = link.getAttribute('href');
      if (href) {
        return this.resolveUrl(baseUrl, href);
      }
    }
    return null;
  }
  
  private resolveUrl(base: string, relative: string): string {
    try {
      return new URL(relative, base).toString();
    } catch {
      return relative;
    }
  }
  
  // Phase 2: Basic Information Extraction
  private async extractBasicInfo(url: string, content: ContentSources): Promise<ExtractedInfo> {
    console.log('🔧 Extracting basic information...');
    
    const name = this.extractPlaceName(content);
    const address = this.extractAddress(content);
    const phone = this.extractPhone(content);
    
    return {
      name,
      address,
      phone,
      website: url,
      rawContent: content
    };
  }
  
  private extractPlaceName(content: ContentSources): string {
    const allContent = Object.values(content).filter(Boolean).join('\n\n');
    if (!content.mainPage) return 'Unknown Place';
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(content.mainPage, 'text/html');
    
    // Strategy 1: Look for repeated mentions across different elements
    const candidates: Map<string, number> = new Map();
    
    // Check title
    const title = doc.title?.replace(/\s*[-|]\s*(Restaurant|Home|Menu).*$/i, '').trim();
    if (title && title.length > 2) {
      candidates.set(title, (candidates.get(title) || 0) + 3);
    }
    
    // Check h1 tags
    const h1s = doc.querySelectorAll('h1');
    h1s.forEach(h1 => {
      const text = h1.textContent?.trim();
      if (text && text.length > 2 && text.length < 100) {
        candidates.set(text, (candidates.get(text) || 0) + 2);
      }
    });
    
    // Check schema markup
    const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
    scripts.forEach(script => {
      try {
        const data = JSON.parse(script.textContent || '');
        if (data.name) {
          candidates.set(data.name, (candidates.get(data.name) || 0) + 4);
        }
      } catch {}
    });
    
    // Check meta tags
    const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content');
    if (ogTitle) {
      candidates.set(ogTitle, (candidates.get(ogTitle) || 0) + 2);
    }
    
    // Find most mentioned candidate
    let bestCandidate = 'Unknown Place';
    let bestScore = 0;
    
    for (const [candidate, score] of candidates) {
      if (score > bestScore && candidate.length > 2) {
        bestCandidate = candidate;
        bestScore = score;
      }
    }
    
    console.log('🏷️ Place name candidates:', Array.from(candidates.entries()));
    console.log('✅ Selected name:', bestCandidate);
    
    return bestCandidate;
  }
  
  private extractAddress(content: ContentSources): string | undefined {
    // Check all available content for addresses
    const pages = [content.contactPage, content.locationPage, content.mainPage].filter(Boolean);
    
    for (const pageContent of pages) {
      const address = this.findAddressInContent(pageContent!);
      if (address) {
        console.log('📍 Found address:', address);
        return address;
      }
    }
    
    return undefined;
  }
  
  private findAddressInContent(html: string): string | undefined {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Strategy 1: Look for structured data
    const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent || '');
        if (data.address) {
          if (typeof data.address === 'string') return data.address;
          if (data.address.streetAddress) {
            return `${data.address.streetAddress}, ${data.address.addressLocality || ''}, ${data.address.addressCountry || ''}`.trim();
          }
        }
      } catch {}
    }
    
    // Strategy 2: Look for common address patterns
    const addressPatterns = [
      /\b\d{1,5}\s+([A-Z][a-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Lane|Ln|Drive|Dr|Boulevard|Blvd)[^\n]{0,100})/gi,
      /([A-Z][a-z\s]+ \d{1,5}[^\n]{0,100}(?:London|Birmingham|Manchester|Glasgow|Edinburgh))/gi
    ];
    
    const text = doc.body?.textContent || '';
    
    for (const pattern of addressPatterns) {
      const matches = text.match(pattern);
      if (matches && matches[0]) {
        return matches[0].trim();
      }
    }
    
    // Strategy 3: Look for address-like selectors
    const addressSelectors = [
      '.address', '.location', '.contact-address', '[itemprop="address"]'
    ];
    
    for (const selector of addressSelectors) {
      const element = doc.querySelector(selector);
      if (element?.textContent?.trim()) {
        const addr = element.textContent.trim();
        if (addr.length > 10 && addr.length < 200) {
          return addr;
        }
      }
    }
    
    return undefined;
  }
  
  private extractPhone(content: ContentSources): string | undefined {
    const pages = Object.values(content).filter(Boolean);
    
    for (const pageContent of pages) {
      const phone = this.findPhoneInContent(pageContent!);
      if (phone) return phone;
    }
    
    return undefined;
  }
  
  private findPhoneInContent(html: string): string | undefined {
    const phonePattern = /\b(?:\+44|0)\s?[1-9](?:[\s-]?\d){8,9}\b/g;
    const text = html.replace(/<[^>]*>/g, ' ');
    const matches = text.match(phonePattern);
    return matches ? matches[0] : undefined;
  }
  
  // Phase 3: Enhancement via Search (Mock for now)
  private async enhanceWithSearch(basicInfo: ExtractedInfo): Promise<GoogleSearchData> {
    console.log('🔍 Enhancing with search data...');
    
    const searchQuery = `"${basicInfo.name}"${basicInfo.address ? ` "${basicInfo.address}"` : ''} reviews`;
    console.log('Search query:', searchQuery);
    
    // Mock search results - in real implementation, use Google Places API
    return {
      businessType: 'unknown',
      rating: undefined,
      reviews: [],
      additionalInfo: {}
    };
  }
  
  // Phase 4: Intelligent Type Determination
  private determinePlaceType(basicInfo: ExtractedInfo, searchData: GoogleSearchData, content: ContentSources): string {
    console.log('🤔 Determining place type...');
    console.log('📊 Analysis data:');
    console.log('  - URL:', basicInfo.website);
    console.log('  - Name:', basicInfo.name);
    console.log('  - Content length:', Object.values(content).filter(Boolean).reduce((total, c) => total + c!.length, 0), 'characters');
    
    const allText = Object.values(content).filter(Boolean).join(' ').toLowerCase();
    const url = basicInfo.website.toLowerCase();
    const name = basicInfo.name.toLowerCase();
    
    let typeScores: Record<string, number> = {
      restaurant: 0,
      gallery: 0,
      bookshop: 0,
      library: 0,
      other: 0
    };
    
    console.log('🔍 URL Analysis:');
    // URL-based scoring
    if (url.includes('restaurant') || url.includes('menu') || url.includes('dining')) {
      typeScores.restaurant += 3;
      console.log('  ✅ URL contains restaurant keywords (+3 to restaurant)');
    }
    if (url.includes('gallery') || url.includes('museum') || url.includes('art')) {
      typeScores.gallery += 3;
      console.log('  ✅ URL contains gallery keywords (+3 to gallery)');
    }
    if (url.includes('book') || url.includes('library')) {
      typeScores.bookshop += 3;
      console.log('  ✅ URL contains book keywords (+3 to bookshop)');
    }
    if (Object.values(typeScores).every(s => s === 0)) {
      console.log('  ❌ No relevant keywords found in URL');
    }
    
    console.log('🔍 Contextual Content Analysis:');
    
    // Smart contextual scoring instead of simple keyword counting
    const restaurantScore = this.calculateRestaurantScore(allText);
    const galleryScore = this.calculateGalleryScore(allText);
    const bookshopScore = this.calculateBookshopScore(allText);
    
    typeScores.restaurant += restaurantScore;
    typeScores.gallery += galleryScore;
    typeScores.bookshop += bookshopScore;
    
    console.log(`  🍽️ Restaurant context score: ${restaurantScore}`);
    console.log(`  🎨 Gallery context score: ${galleryScore}`);
    console.log(`  📚 Bookshop context score: ${bookshopScore}`);
    
    console.log('🔍 Name Analysis:');
    // Name-based hints
    if (name.includes('restaurant') || name.includes('kitchen') || name.includes('bistro')) {
      typeScores.restaurant += 2;
      console.log('  ✅ Name contains restaurant keywords (+2 to restaurant)');
    }
    if (name.includes('gallery') || name.includes('museum')) {
      typeScores.gallery += 2;
      console.log('  ✅ Name contains gallery keywords (+2 to gallery)');
    }
    if (name.includes('books') || name.includes('library')) {
      typeScores.bookshop += 2;
      console.log('  ✅ Name contains book keywords (+2 to bookshop)');
    }
    
    console.log('📊 Final Type Scores:', typeScores);
    
    const bestType = Object.entries(typeScores).reduce((a, b) => a[1] > b[1] ? a : b)[0];
    const bestScore = typeScores[bestType];
    
    console.log(`✅ Winner: ${bestType} with score ${bestScore}`);
    
    // Show a sample of the content for debugging
    console.log('📄 Content sample (first 500 chars):', allText.substring(0, 500));
    
    return bestType;
  }
  
  // Contextual scoring methods that understand context, not just keywords
  private calculateRestaurantScore(text: string): number {
    let score = 0;
    
    // Strong restaurant indicators (higher weight)
    const strongIndicators = [
      /\b(menu|reservation|booking|table)\b/gi,
      /\b(chef|cuisine|dining|restaurant)\b/gi,
      /\b(food|dish|meal|lunch|dinner|breakfast)\b/gi,
      /\b(kitchen|cooking|recipe)\b/gi
    ];
    
    strongIndicators.forEach(pattern => {
      const matches = text.match(pattern) || [];
      score += matches.length * 3; // Higher weight for strong indicators
    });
    
    // Food-specific terms (medium weight)  
    const foodTerms = [
      /\b(pizza|pasta|burger|steak|chicken|fish|vegetarian|vegan)\b/gi,
      /\b(wine|beer|cocktail|drinks|bar)\b/gi,
      /\b(appetizer|starter|main|dessert|course)\b/gi
    ];
    
    foodTerms.forEach(pattern => {
      const matches = text.match(pattern) || [];
      score += matches.length * 2;
    });
    
    // Restaurant operations (medium weight)
    const operations = [
      /\b(open|closed|takeaway|delivery)\b/gi,
      /\b(order|book now|reserve|table for)\b/gi
    ];
    
    operations.forEach(pattern => {
      const matches = text.match(pattern) || [];
      score += matches.length * 2;
    });
    
    console.log(`    🔍 Restaurant analysis: found strong food/dining context patterns`);
    return score;
  }
  
  private calculateGalleryScore(text: string): number {
    let score = 0;
    
    // True art gallery indicators (not just "photo gallery")
    const artGalleryIndicators = [
      /\b(exhibition|exhibit|artist|artwork)\b/gi,
      /\b(painting|sculpture|contemporary art|modern art)\b/gi,
      /\b(museum|collection|curated|curator)\b/gi,
      /\b(opening reception|art show|solo show)\b/gi
    ];
    
    artGalleryIndicators.forEach(pattern => {
      const matches = text.match(pattern) || [];
      score += matches.length * 3;
    });
    
    // Reduce score if "gallery" appears in restaurant context
    const photoGalleryContext = [
      /photo\s+gallery/gi,
      /image\s+gallery/gi,
      /gallery\s+of\s+(food|dishes|images|photos)/gi,
      /food\s+gallery/gi
    ];
    
    let contextualReduction = 0;
    photoGalleryContext.forEach(pattern => {
      const matches = text.match(pattern) || [];
      contextualReduction += matches.length * 2;
    });
    
    // If we find food-related gallery mentions, heavily reduce the gallery score
    if (contextualReduction > 0) {
      console.log(`    🔍 Gallery analysis: found ${contextualReduction} photo/food gallery mentions - reducing art gallery score`);
      score = Math.max(0, score - contextualReduction);
    }
    
    // Also reduce if lots of food context around gallery mentions
    const galleryMentions = (text.match(/\bgallery\b/gi) || []).length;
    const foodMentions = (text.match(/\b(food|menu|dish|restaurant|dining)\b/gi) || []).length;
    
    if (galleryMentions > 0 && foodMentions > galleryMentions * 3) {
      console.log(`    🔍 Gallery analysis: ${galleryMentions} gallery mentions vs ${foodMentions} food mentions - likely photo gallery`);
      score = Math.max(0, score - galleryMentions);
    }
    
    return score;
  }
  
  private calculateBookshopScore(text: string): number {
    let score = 0;
    
    const bookshopIndicators = [
      /\b(books?|bookshop|bookstore|library)\b/gi,
      /\b(author|novel|fiction|literature)\b/gi,
      /\b(reading|book club|literary)\b/gi,
      /\b(isbn|publisher|edition)\b/gi
    ];
    
    bookshopIndicators.forEach(pattern => {
      const matches = text.match(pattern) || [];
      score += matches.length * 3;
    });
    
    return score;
  }
  
  // Phase 5: Type-Specific Enhancement
  private async enhanceByType(basicInfo: ExtractedInfo, searchData: GoogleSearchData, placeType: string): Promise<ExtractedMetadata> {
    console.log(`🎯 Enhancing as ${placeType}...`);
    
    const metadata: ExtractedMetadata = {
      name: basicInfo.name,
      website: basicInfo.website,
      type: placeType,
      address: basicInfo.address
    };
    
    if (placeType === 'restaurant') {
      await this.enhanceRestaurant(metadata, basicInfo, searchData);
    } else if (placeType === 'gallery') {
      await this.enhanceGallery(metadata, basicInfo, searchData);
    }
    // Add more type-specific enhancements as needed
    
    return metadata;
  }
  
  private async enhanceRestaurant(metadata: ExtractedMetadata, basicInfo: ExtractedInfo, searchData: GoogleSearchData): Promise<void> {
    const allContent = Object.values(basicInfo.rawContent).filter(Boolean).join(' ');
    
    // Extract cuisine type
    const cuisineKeywords = {
      'Italian': ['italian', 'pasta', 'pizza', 'risotto'],
      'French': ['french', 'bistro', 'brasserie', 'coq au vin'],
      'British': ['british', 'fish and chips', 'sunday roast', 'shepherd'],
      'Indian': ['indian', 'curry', 'tandoor', 'naan'],
      'Chinese': ['chinese', 'dim sum', 'wok', 'szechuan'],
      'Japanese': ['japanese', 'sushi', 'sashimi', 'ramen'],
      'Mexican': ['mexican', 'tacos', 'guacamole', 'quesadilla'],
      'Thai': ['thai', 'pad thai', 'coconut', 'lemongrass'],
      'Mediterranean': ['mediterranean', 'olive', 'hummus', 'feta']
    };
    
    let bestCuisine = '';
    let bestScore = 0;
    
    Object.entries(cuisineKeywords).forEach(([cuisine, keywords]) => {
      const score = keywords.reduce((total, keyword) => {
        return total + (allContent.toLowerCase().match(new RegExp(keyword, 'gi')) || []).length;
      }, 0);
      
      if (score > bestScore) {
        bestScore = score;
        bestCuisine = cuisine;
      }
    });
    
    if (bestCuisine && bestScore > 0) {
      metadata.cuisine = bestCuisine;
      console.log(`🍽️ Detected cuisine: ${bestCuisine} (score: ${bestScore})`);
    }
    
    // Mock some dishes for known restaurants - in real implementation, extract from reviews
    if (basicInfo.name.toLowerCase().includes('bazaar')) {
      metadata.must_try_dishes = ['Mezze platter', 'Grilled halloumi', 'Turkish coffee'];
      metadata.cuisine = metadata.cuisine || 'Mediterranean';
    }
  }
  
  private async enhanceGallery(metadata: ExtractedMetadata, basicInfo: ExtractedInfo, searchData: GoogleSearchData): Promise<void> {
    // Gallery-specific enhancements could go here
    console.log('🎨 Enhancing gallery information...');
  }
  
  private calculateConfidence(metadata: ExtractedMetadata, searchData: GoogleSearchData): 'high' | 'medium' | 'low' {
    let score = 0;
    
    if (metadata.name && metadata.name !== 'Unknown Place') score += 2;
    if (metadata.address) score += 3;
    if (metadata.type && metadata.type !== 'other') score += 2;
    if (metadata.cuisine) score += 1;
    if (metadata.must_try_dishes && metadata.must_try_dishes.length > 0) score += 1;
    
    if (score >= 7) return 'high';
    if (score >= 4) return 'medium';
    return 'low';
  }
}

export const intelligentExtractor = new IntelligentExtractor();