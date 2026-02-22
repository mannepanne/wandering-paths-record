# Testing Strategy

**Status:** Not yet implemented - planned for future phase

**Related Documents:**
- `REFERENCE/DEVELOPMENT.md` - Current development workflow
- `.claude/CLAUDE.md` - Testing philosophy and TDD principles

---

## Philosophy: Tests as Development Guardrails

**Inspired by:** [OpenAI's Harness Engineering](https://openai.com/index/harness-engineering/) approach to agent-driven development.

Tests in this project serve dual purposes:

1. **Validation** - Verify code works correctly (traditional testing)
2. **Directional Context** - Guide agents on what to build and how to build it

When an AI agent makes changes, tests should:
- Immediately signal if changes break existing functionality
- Provide clear context about what each component should do
- Act as executable specifications that agents can read and understand
- Make it obvious when a change is going in the wrong direction

---

## Testing Principles

### 1. Tests Define Expected Behavior

Tests are **living specifications**. Before writing implementation code, write tests that describe:
- What should happen in the happy path
- What should happen when things go wrong
- What constraints and validations must be enforced

### 2. High Coverage Goal

Aim for comprehensive coverage because:
- Agents need clear examples of how code should behave
- Untested code is unclear about its purpose and constraints
- Coverage gaps indicate missing specifications
- Target: 95%+ lines/functions/statements, 90%+ branches

### 3. Tests Fail Fast with Clear Messages

When tests fail, the error message should:
- Explain **what** was expected
- Show **what** actually happened
- Indicate **where** to look (file:line references)
- Suggest **why** it might have failed

### 4. Test Organization Mirrors Code Structure

```
src/
  services/restaurants.ts
  services/claudeExtractor.ts
  components/PlaceCard.tsx

tests/
  services/restaurants.test.ts
  services/claudeExtractor.test.ts
  components/PlaceCard.test.tsx
```

Agents can quickly find relevant tests when modifying code.

### 5. Tests Are Self-Contained

Each test should:
- Set up its own fixtures and data
- Clean up after itself
- Not depend on other tests running first
- Be runnable in isolation

---

## Testing Framework

### Technology Stack

**Test Runner:** [Vitest](https://vitest.dev/)
- Fast, modern, built for TypeScript
- Great DX with watch mode and coverage
- Native Vite integration (already using Vite)
- Supports ES modules natively
- Better performance than Jest

**Component Testing:** [React Testing Library](https://testing-library.com/react)
- User-centric testing approach
- Works well with Vitest
- Tests behavior, not implementation details

**Assertion Library:** Vitest's built-in assertions (compatible with Chai/Jest)

**Mocking:** Vitest's built-in mocking + custom mocks for external services

**Coverage:** Vitest with v8 coverage provider

### Setup Requirements

```bash
npm install -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom happy-dom
```

**Configuration:** `vitest.config.ts` in project root

---

## Test Categories

### 1. Unit Tests

**Purpose:** Test individual functions and utilities in isolation

**Priority Areas:**
- Slug generation and uniqueness checking
- Data transformation utilities
- Validation functions
- Claude extraction response parsing
- Geocoding response processing

**Example Structure:**
```typescript
// tests/services/claudeExtractor.test.ts
import { describe, it, expect } from 'vitest';
import { extractJSONFromResponse, inferCityFromLocation } from '@/services/claudeExtractor';

describe('extractJSONFromResponse', () => {
  it('parses clean JSON response', () => {
    const response = '{"name": "Test Restaurant"}';
    expect(extractJSONFromResponse(response)).toEqual({ name: 'Test Restaurant' });
  });

  it('extracts JSON from Claude text wrapper', () => {
    const response = 'Here is the data: {"name": "Test"} - analysis complete';
    expect(extractJSONFromResponse(response)).toEqual({ name: 'Test' });
  });
});

describe('inferCityFromLocation', () => {
  it('infers London from Shoreditch neighborhood', () => {
    const location = { locationName: 'Shoreditch', fullAddress: '123 High St' };
    expect(inferCityFromLocation(location)).toBe('London');
  });
});
```

### 2. Integration Tests

**Purpose:** Test how components work together

**Priority Areas:**
- Supabase CRUD operations with mock client
- Component interactions (PlaceCard, FilterBar)
- Service layer integration (restaurant search, geocoding)
- AI extraction workflow (mocked Claude API)

**Example Structure:**
```typescript
// tests/services/restaurants.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchRestaurants, addRestaurant } from '@/services/restaurants';

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        data: [{ id: '1', name: 'Test Restaurant' }],
        error: null
      }))
    }))
  }))
}));

describe('Restaurant Service', () => {
  it('fetches restaurants from Supabase', async () => {
    const restaurants = await fetchRestaurants();
    expect(restaurants).toHaveLength(1);
    expect(restaurants[0].name).toBe('Test Restaurant');
  });
});
```

### 3. Component Tests

**Purpose:** Test React components render correctly and handle interactions

**Priority Areas:**
- PlaceCard displays restaurant data
- FilterBar updates filters on input
- AdminPanel shows/hides based on auth
- Map markers render for restaurant locations

**Example Structure:**
```typescript
// tests/components/PlaceCard.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlaceCard } from '@/components/PlaceCard';

describe('PlaceCard', () => {
  const mockRestaurant = {
    id: '1',
    name: 'Test Restaurant',
    address: 'Shoreditch, London',
    status: 'to-visit',
    cuisine_primary: 'Italian'
  };

  it('displays restaurant name', () => {
    render(<PlaceCard restaurant={mockRestaurant} />);
    expect(screen.getByText('Test Restaurant')).toBeInTheDocument();
  });

  it('shows correct status badge', () => {
    render(<PlaceCard restaurant={mockRestaurant} />);
    expect(screen.getByText('To Visit')).toBeInTheDocument();
  });
});
```

### 4. End-to-End Tests (Future)

**Purpose:** Test complete user workflows

**Scope:**
- Public user can view restaurant list and map
- Admin can authenticate via magic link
- Admin can add restaurant via AI extraction
- Admin can manually edit restaurant details
- Filtering and search work correctly

**Framework:** Playwright (when E2E tests are implemented)

---

## Test-Driven Development Workflow

### For New Features

1. **Write failing tests first** - Define expected behavior
2. **Implement minimum code** - Make tests pass
3. **Refactor** - Improve code while keeping tests green
4. **Verify coverage** - Ensure high coverage of new code

### For Bug Fixes

1. **Write failing test** - Reproduce the bug
2. **Fix the bug** - Make test pass
3. **Add edge case tests** - Prevent regression

### For Refactoring

1. **Verify existing tests pass** - Baseline
2. **Refactor code** - Change implementation
3. **Tests still pass** - Behavior unchanged
4. **Coverage maintained** - No gaps introduced

---

## Mocking Strategy

### What to Mock

**External Services:**
- Anthropic Claude API (AI extraction)
- Google Maps API (geocoding, places)
- Supabase client (database operations)
- Mapbox (map rendering)

**Why Mock:**
- Tests run fast without network calls
- Avoid API costs during testing
- Control responses for edge cases
- Tests work offline

### What NOT to Mock

**Core Logic:**
- Data transformations
- Validation functions
- Utility functions
- State management logic

**Reason:** These are the primary value of our code - mocking them defeats the purpose of testing.

### Mock Implementations

Create reusable mocks in `tests/mocks/`:

```typescript
// tests/mocks/supabase.ts
export function createMockSupabase() {
  const mockData = new Map();

  return {
    from: (table: string) => ({
      select: vi.fn(() => ({
        data: Array.from(mockData.values()),
        error: null
      })),
      insert: vi.fn((data: any) => {
        mockData.set(data.id, data);
        return { data, error: null };
      })
    })
  };
}

// tests/mocks/claude.ts
export function createMockClaudeResponse() {
  return {
    name: 'Mock Restaurant',
    cuisine_primary: 'Italian',
    locations: [
      {
        locationName: 'Shoreditch',
        fullAddress: '123 High St, London E1 6AN',
        city: 'London',
        country: 'United Kingdom'
      }
    ]
  };
}
```

---

## Coverage Requirements

### Overall Coverage Target: 95%+

**Why high coverage?**
- Every line of code should have a clear purpose
- If we can't test it, maybe we don't need it
- Agents need complete context about all code paths

### Per-File Coverage Requirements

| File Type | Statements | Branches | Functions | Lines |
| --- | --- | --- | --- | --- |
| Services | 95%+ | 90%+ | 100% | 95%+ |
| Components | 90%+ | 85%+ | 90%+ | 90%+ |
| Utils | 100% | 100% | 100% | 100% |
| Types | N/A | N/A | N/A | N/A |
| Config | N/A | N/A | N/A | N/A |

**Allowed Exceptions:**
- Type definition files (no executable code)
- Configuration files (`vite.config.ts`, `wrangler.toml`)
- Explicitly marked `/* istanbul ignore */` blocks with explanation

### Coverage Reporting

```bash
npm run test:coverage
```

**Output:**
- Terminal summary (immediate feedback)
- HTML report in `coverage/index.html` (detailed drill-down)
- Coverage badges in README (visibility)

---

## CI/CD Integration (Future)

### Pre-Commit Hooks

Run tests locally before commit:
```bash
npm run test:changed  # Only test files related to staged changes
```

### Pull Request Checks

GitHub Actions should verify:
1. **All tests pass** - No failures allowed
2. **Coverage maintained** - No decrease from main branch
3. **TypeScript compiles** - No type errors
4. **Linting passes** - Code style consistent

### Deployment Gate

**Production deployment blocked if:**
- Any test fails
- Coverage below 90% overall
- Critical paths not tested

---

## Test Documentation Standards

### Test Naming

Use clear, descriptive test names that read like specifications:

**Good:**
```typescript
it('extracts restaurant name from Claude response')
it('returns 404 when restaurant not found')
it('geocodes address using Google Maps API')
```

**Bad:**
```typescript
it('works')
it('test extraction')
it('returns error')
```

### Test Organization

Group related tests with `describe` blocks:

```typescript
describe('Restaurant Extraction', () => {
  describe('extractJSONFromResponse()', () => {
    it('parses clean JSON');
    it('handles Claude text wrapper');
    it('throws on invalid JSON');
  });

  describe('inferCityFromLocation()', () => {
    it('infers London from neighborhood');
    it('returns null for unknown location');
  });
});
```

---

## Current Implementation Status

**⚠️ Tests Not Yet Implemented**

This document serves as a specification for future testing implementation. When implementing tests:

1. Start with critical paths (restaurant CRUD, AI extraction)
2. Add service layer tests before component tests
3. Mock external services from the start
4. Track coverage as you go

**Priority Test Implementation Order:**
1. Core utilities (JSON parsing, city inference)
2. Supabase service layer (CRUD operations)
3. AI extraction logic (Claude API integration)
4. Critical components (PlaceCard, FilterBar)
5. Full integration workflows

---

## Measuring Success

### Quantitative Metrics

- **Coverage:** 95%+ of lines, 90%+ of branches
- **Test Speed:** Full suite runs in < 30 seconds
- **PR Velocity:** Tests catch issues before manual review
- **Bug Escape Rate:** Zero bugs reach production that tests should have caught

### Qualitative Metrics

- **Agent Confidence:** Can AI make changes safely with test guidance?
- **Developer Clarity:** Do tests clearly show what code should do?
- **Maintenance Burden:** Are tests easy to update when requirements change?

---

## Future Enhancements (Post-Initial Implementation)

- **Property-based testing** - Generate random inputs to find edge cases
- **Mutation testing** - Verify tests actually catch bugs
- **Visual regression testing** - Catch UI changes
- **Performance testing** - Validate load times stay under threshold
- **Accessibility testing** - WCAG compliance

---

**Status:** Specification complete, ready for implementation
**Next Step:** Set up Vitest and write first unit tests for utilities
