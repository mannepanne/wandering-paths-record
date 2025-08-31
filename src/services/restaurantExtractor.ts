export interface ExtractedRestaurantData {
  name: string;
  address?: string;
  website: string;
  public_rating?: number;
  cuisine?: string;
  must_try_dishes?: string[];
  description?: string;
  price_range?: '$' | '$$' | '$$$' | '$$$$';
  atmosphere?: string;
  dietary_options?: string[];
  booking_required?: boolean;
}

export interface RestaurantExtractionResult {
  success: boolean;
  data?: ExtractedRestaurantData;
  error?: string;
  confidence: 'high' | 'medium' | 'low';
}

export class RestaurantExtractor {
  
  async extractFromUrl(url: string): Promise<RestaurantExtractionResult> {
    try {
      console.log('🍽️ Starting restaurant extraction for:', url);
      
      // Phase 1: Gather restaurant content
      const content = await this.gatherRestaurantContent(url);
      
      // Phase 2: Extract basic restaurant info
      const basicInfo = await this.extractBasicRestaurantInfo(url, content);
      
      // Phase 3: Extract restaurant-specific details
      const restaurantDetails = await this.extractRestaurantSpecifics(content);
      
      // Phase 4: Combine and validate
      const finalData = { ...basicInfo, ...restaurantDetails };
      
      return {
        success: true,
        data: finalData,
        confidence: this.calculateConfidence(finalData)
      };
      
    } catch (error) {
      console.error('❌ Restaurant extraction failed:', error);
      return {
        success: false,
        error: 'Failed to extract restaurant information',
        confidence: 'low'
      };
    }
  }
  
  private async gatherRestaurantContent(url: string): Promise<{
    mainPage?: string;
    menuPage?: string;
    contactPage?: string;
  }> {
    console.log('📄 Gathering restaurant content...');
    
    const content: { mainPage?: string; menuPage?: string; contactPage?: string } = {};
    
    // Get main page
    content.mainPage = await this.fetchPage(url);
    
    if (content.mainPage) {
      // Look for menu page
      const menuUrl = this.findMenuPageUrl(url, content.mainPage);
      if (menuUrl) {
        console.log('🍽️ Found menu page:', menuUrl);
        content.menuPage = await this.fetchPage(menuUrl);
      }
      
      // Look for contact page
      const contactUrl = this.findContactPageUrl(url, content.mainPage);
      if (contactUrl) {
        console.log('📞 Found contact page:', contactUrl);
        content.contactPage = await this.fetchPage(contactUrl);
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
  
  private findMenuPageUrl(baseUrl: string, html: string): string | null {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const menuLinks = doc.querySelectorAll('a[href*="menu"], a[href*="Menu"], a[href*="food"]');
    for (const link of menuLinks) {
      const href = link.getAttribute('href');
      if (href) {
        return this.resolveUrl(baseUrl, href);
      }
    }
    return null;
  }
  
  private findContactPageUrl(baseUrl: string, html: string): string | null {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const contactLinks = doc.querySelectorAll('a[href*="contact"], a[href*="Contact"], a[href*="location"]');
    for (const link of contactLinks) {
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
  
  private async extractBasicRestaurantInfo(url: string, content: any): Promise<Partial<ExtractedRestaurantData>> {
    console.log('🔧 Extracting basic restaurant information...');
    
    const name = this.extractRestaurantName(content);
    const address = this.extractAddress(content);
    const rating = this.extractRating(content);
    
    console.log('✅ Basic info extracted:', { name, address, rating });
    
    return {
      name,
      address,
      website: url,
      public_rating: rating
    };
  }
  
  private extractRestaurantName(content: any): string {
    if (!content.mainPage) return 'Unknown Restaurant';
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(content.mainPage, 'text/html');
    
    // Prioritize restaurant-specific name extraction
    const candidates: Map<string, number> = new Map();
    
    // Schema markup (highest priority)
    const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
    scripts.forEach(script => {
      try {
        const data = JSON.parse(script.textContent || '');
        if (data['@type'] === 'Restaurant' && data.name) {
          candidates.set(data.name, (candidates.get(data.name) || 0) + 5);
        } else if (data.name) {
          candidates.set(data.name, (candidates.get(data.name) || 0) + 3);
        }
      } catch {}
    });
    
    // Clean title (remove SEO fluff)
    const title = doc.title?.replace(/\s*[-|]\s*(Restaurant|Menu|Home|Order|Book).*$/i, '').trim();
    if (title && title.length > 2) {
      candidates.set(title, (candidates.get(title) || 0) + 3);
    }
    
    // Restaurant-specific selectors
    const restaurantSelectors = [
      '.restaurant-name',
      '.brand-name', 
      'h1[class*="name"]',
      '[itemprop="name"]'
    ];
    
    restaurantSelectors.forEach(selector => {
      const element = doc.querySelector(selector);
      if (element?.textContent?.trim()) {
        const text = element.textContent.trim();
        if (text.length > 3 && text.length < 100) {
          candidates.set(text, (candidates.get(text) || 0) + 2);
        }
      }
    });
    
    // Find best candidate
    let bestName = 'Unknown Restaurant';
    let bestScore = 0;
    
    for (const [candidate, score] of candidates) {
      if (score > bestScore && candidate.length > 2) {
        bestName = candidate;
        bestScore = score;
      }
    }
    
    console.log('🏷️ Restaurant name candidates:', Array.from(candidates.entries()));
    console.log('✅ Selected name:', bestName);
    
    return bestName;
  }
  
  private extractAddress(content: any): string | undefined {
    const pages = [content.contactPage, content.mainPage].filter(Boolean);
    
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
    
    // Schema markup first
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
    
    // Address selectors
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
  
  private extractRating(content: any): number | undefined {
    if (!content.mainPage) return undefined;
    
    const allText = Object.values(content).filter(Boolean).join(' ');
    
    // Common rating patterns
    const ratingPatterns = [
      /(\d\.\d)\s*\/\s*5\s*star/gi,
      /(\d\.\d)\s*star/gi,
      /rating["']?\s*:\s*["']?(\d+(?:\.\d+)?)/i,
    ];
    
    for (const pattern of ratingPatterns) {
      const matches = allText.match(pattern);
      if (matches && matches[1]) {
        const rating = parseFloat(matches[1]);
        if (rating >= 1 && rating <= 5) {
          console.log(`⭐ Found rating: ${rating}`);
          return Math.round(rating * 10) / 10;
        }
      }
    }
    
    return undefined;
  }
  
  private async extractRestaurantSpecifics(content: any): Promise<Partial<ExtractedRestaurantData>> {
    console.log('🍽️ Extracting restaurant-specific details...');
    
    const allText = Object.values(content).filter(Boolean).join(' ').toLowerCase();
    
    const cuisine = this.extractCuisineType(allText);
    const dishes = this.extractMustTryDishes(content);
    const priceRange = this.extractPriceRange(allText);
    const atmosphere = this.extractAtmosphere(allText);
    const dietaryOptions = this.extractDietaryOptions(allText);
    const bookingRequired = this.extractBookingInfo(allText);
    
    console.log('🎯 Restaurant specifics:', { cuisine, dishes, priceRange, atmosphere, dietaryOptions, bookingRequired });
    
    return {
      cuisine,
      must_try_dishes: dishes,
      price_range: priceRange,
      atmosphere,
      dietary_options: dietaryOptions,
      booking_required: bookingRequired
    };
  }
  
  private extractCuisineType(text: string): string | undefined {
    const cuisineKeywords = {
      'Italian': ['italian', 'pasta', 'pizza', 'risotto', 'gelato'],
      'French': ['french', 'bistro', 'brasserie', 'croissant'],
      'British': ['british', 'fish and chips', 'sunday roast', 'pub'],
      'Indian': ['indian', 'curry', 'tandoor', 'naan', 'biryani'],
      'Chinese': ['chinese', 'dim sum', 'wok', 'szechuan'],
      'Japanese': ['japanese', 'sushi', 'sashimi', 'ramen', 'tempura'],
      'Mexican': ['mexican', 'tacos', 'guacamole', 'quesadilla'],
      'Thai': ['thai', 'pad thai', 'coconut', 'lemongrass'],
      'Mediterranean': ['mediterranean', 'olive', 'hummus', 'feta'],
      'American': ['american', 'burger', 'bbq', 'steakhouse'],
      'Turkish': ['turkish', 'kebab', 'baklava', 'mezze'],
      'Lebanese': ['lebanese', 'tabbouleh', 'fattoush', 'shawarma']
    };
    
    let bestCuisine = '';
    let bestScore = 0;
    
    Object.entries(cuisineKeywords).forEach(([cuisine, keywords]) => {
      const score = keywords.reduce((total, keyword) => {
        return total + (text.match(new RegExp(keyword, 'gi')) || []).length;
      }, 0);
      
      if (score > bestScore) {
        bestScore = score;
        bestCuisine = cuisine;
      }
    });
    
    if (bestCuisine && bestScore > 0) {
      console.log(`🌍 Detected cuisine: ${bestCuisine} (score: ${bestScore})`);
      return bestCuisine;
    }
    
    return undefined;
  }
  
  private extractMustTryDishes(content: any): string[] | undefined {
    if (!content.menuPage && !content.mainPage) return undefined;
    
    const menuText = (content.menuPage || content.mainPage);
    if (!menuText) return undefined;
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(menuText, 'text/html');
    
    const dishes: string[] = [];
    const dishSelectors = [
      '.signature', '.specialty', '.recommended', '.popular',
      '.menu-item.featured', '.highlight', '[data-popular]'
    ];
    
    dishSelectors.forEach(selector => {
      const elements = doc.querySelectorAll(selector);
      elements.forEach(element => {
        const dish = element.textContent?.trim();
        if (dish && dish.length > 3 && dish.length < 100) {
          dishes.push(dish);
        }
      });
    });
    
    return dishes.length > 0 ? dishes.slice(0, 6) : undefined;
  }
  
  private extractPriceRange(text: string): '$' | '$$' | '$$$' | '$$$$' | undefined {
    // Look for explicit price indicators
    if (text.includes('fine dining') || text.includes('michelin') || text.includes('tasting menu')) return '$$$$';
    if (text.includes('casual dining') || text.includes('mid-range')) return '$$';
    if (text.includes('affordable') || text.includes('budget') || text.includes('cheap eats')) return '$';
    
    // Look for price symbols
    const priceSymbols = text.match(/\$+/g);
    if (priceSymbols) {
      const maxLength = Math.max(...priceSymbols.map(p => p.length));
      if (maxLength >= 4) return '$$$$';
      if (maxLength === 3) return '$$$';
      if (maxLength === 2) return '$$';
      return '$';
    }
    
    return undefined;
  }
  
  private extractAtmosphere(text: string): string | undefined {
    const atmosphereKeywords = {
      'Casual': ['casual', 'relaxed', 'laid-back', 'informal'],
      'Fine Dining': ['fine dining', 'elegant', 'sophisticated', 'upscale'],
      'Romantic': ['romantic', 'intimate', 'cozy', 'candlelit'],
      'Family Friendly': ['family', 'kids', 'children', 'family-friendly'],
      'Trendy': ['trendy', 'hip', 'modern', 'contemporary'],
      'Traditional': ['traditional', 'authentic', 'classic', 'heritage']
    };
    
    let bestAtmosphere = '';
    let bestScore = 0;
    
    Object.entries(atmosphereKeywords).forEach(([atmosphere, keywords]) => {
      const score = keywords.reduce((total, keyword) => {
        return total + (text.match(new RegExp(keyword, 'gi')) || []).length;
      }, 0);
      
      if (score > bestScore) {
        bestScore = score;
        bestAtmosphere = atmosphere;
      }
    });
    
    return bestAtmosphere || undefined;
  }
  
  private extractDietaryOptions(text: string): string[] | undefined {
    const options: string[] = [];
    
    if (text.includes('vegetarian')) options.push('Vegetarian');
    if (text.includes('vegan')) options.push('Vegan');
    if (text.includes('gluten-free') || text.includes('gluten free')) options.push('Gluten-free');
    if (text.includes('halal')) options.push('Halal');
    if (text.includes('kosher')) options.push('Kosher');
    
    return options.length > 0 ? options : undefined;
  }
  
  private extractBookingInfo(text: string): boolean | undefined {
    const bookingKeywords = ['reservation required', 'booking required', 'book ahead', 'advance booking'];
    const walkInKeywords = ['walk-in', 'no reservation', 'first come'];
    
    const hasBookingRequired = bookingKeywords.some(keyword => 
      text.includes(keyword.toLowerCase())
    );
    
    const hasWalkIn = walkInKeywords.some(keyword => 
      text.includes(keyword.toLowerCase())
    );
    
    if (hasBookingRequired) return true;
    if (hasWalkIn) return false;
    
    return undefined;
  }
  
  private calculateConfidence(data: ExtractedRestaurantData): 'high' | 'medium' | 'low' {
    let score = 0;
    
    if (data.name && data.name !== 'Unknown Restaurant') score += 3;
    if (data.address) score += 3;
    if (data.cuisine) score += 2;
    if (data.must_try_dishes && data.must_try_dishes.length > 0) score += 2;
    if (data.public_rating) score += 1;
    if (data.price_range) score += 1;
    
    if (score >= 9) return 'high';
    if (score >= 6) return 'medium';
    return 'low';
  }
}

export const restaurantExtractor = new RestaurantExtractor();