import { describe, expect, it, vi } from 'vitest';
import {
  getFilteredCollectionPresentation,
  initializeFilteredCollections,
} from '../lib/filtered-collection';

class FakeElement {
  readonly children: FakeElement[] = [];
  readonly dataset: Record<string, string> = {};
  readonly classList = {
    add: vi.fn(),
    contains: (name: string) => this.classes.has(name),
    toggle: (name: string, force?: boolean) => {
      if (force ?? !this.classes.has(name)) this.classes.add(name);
      else this.classes.delete(name);
    },
  };
  hidden = false;
  textContent = '';
  parentElement: FakeElement | null = null;
  ownerDocument: { getElementById(id: string): FakeElement | null } | null = null;
  private readonly attributes = new Map<string, string>();
  private readonly classes = new Set<string>();
  private readonly listeners = new Map<string, () => void>();

  constructor(readonly tagName: string) {}

  append(...children: FakeElement[]) {
    for (const child of children) {
      child.parentElement = this;
      this.children.push(child);
    }
  }

  contains(candidate: FakeElement): boolean {
    return this.children.some((child) => child === candidate || child.contains(candidate));
  }

  addEventListener(type: string, listener: () => void) {
    this.listeners.set(type, listener);
  }

  click() {
    this.listeners.get('click')?.();
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }

  querySelectorAll<T extends FakeElement>(selector: string): T[] {
    const descendants = this.children.flatMap((child) => [child, ...child.descendants()]);
    return descendants.filter((element) => {
      if (selector === 'button') return element.tagName === 'BUTTON';
      if (selector === 'button[data-filter-value]') {
        return element.tagName === 'BUTTON' && 'filterValue' in element.dataset;
      }
      return selector === '[aria-live="polite"]' && element.getAttribute('aria-live') === 'polite';
    }) as T[];
  }

  querySelector<T extends FakeElement>(selector: string): T | null {
    return this.querySelectorAll<T>(selector)[0] ?? null;
  }

  descendants(): FakeElement[] {
    return this.children.flatMap((child) => [child, ...child.descendants()]);
  }

  scrollIntoView() {}
}

class FakeScope {
  constructor(private readonly roots: FakeElement[]) {}

  querySelectorAll<T extends FakeElement>(selector: string): T[] {
    return selector === '[data-filtered-collection]' ? (this.roots as T[]) : [];
  }
}

function createFilteredCollectionFixture() {
  const root = new FakeElement('SECTION');
  root.dataset.filteredCollection = '';
  root.dataset.itemLabel = 'projects';
  root.dataset.mobileBreakpoint = '640';

  const filters = ['all', 'web'].map((value, index) => {
    const filter = new FakeElement('BUTTON');
    filter.dataset.filterValue = value;
    filter.setAttribute('aria-pressed', String(index === 0));
    if (index === 0) filter.classList.add('active');
    return filter;
  });

  const toggle = new FakeElement('BUTTON');
  toggle.dataset.moreLabel = 'Show more';
  toggle.dataset.lessLabel = 'Show less';
  toggle.setAttribute('aria-controls', 'demo-grid');
  toggle.setAttribute('aria-expanded', 'false');
  const toggleContainer = new FakeElement('DIV');
  toggleContainer.append(toggle);

  const announcer = new FakeElement('DIV');
  announcer.setAttribute('aria-live', 'polite');

  const cards = Array.from({ length: 7 }, (_, index) => {
    const card = new FakeElement('ARTICLE');
    card.dataset.filterValue = index === 6 ? 'web' : 'all';
    return card;
  });
  const grid = new FakeElement('DIV');
  grid.append(...cards);
  Object.defineProperty(grid, 'id', { value: 'demo-grid' });

  root.append(...filters, toggleContainer, announcer, grid);
  root.ownerDocument = {
    getElementById: (id: string) => (id === 'demo-grid' ? grid : null),
  };

  return { root, toggle, cards, announcer, scope: new FakeScope([root]) };
}

describe('getFilteredCollectionPresentation', () => {
  it('limits mobile results to one page until the collection is expanded', () => {
    expect(
      getFilteredCollectionPresentation({
        totalCount: 8,
        isMobile: true,
        mobileShown: 3,
        expanded: false,
      })
    ).toEqual({ visibleCount: 3, buttonVisible: true, expanded: false });

    expect(
      getFilteredCollectionPresentation({
        totalCount: 8,
        isMobile: true,
        mobileShown: 8,
        expanded: true,
      })
    ).toEqual({ visibleCount: 8, buttonVisible: true, expanded: true });
  });

  it('limits desktop results to six until the collection is expanded', () => {
    expect(
      getFilteredCollectionPresentation({
        totalCount: 8,
        isMobile: false,
        mobileShown: 3,
        expanded: false,
      })
    ).toEqual({ visibleCount: 6, buttonVisible: true, expanded: false });

    expect(
      getFilteredCollectionPresentation({
        totalCount: 6,
        isMobile: false,
        mobileShown: 3,
        expanded: false,
      })
    ).toEqual({ visibleCount: 6, buttonVisible: false, expanded: false });
  });
});

describe('initializeFilteredCollections', () => {
  it('initializes declarative roots and owns their DOM presentation state', () => {
    vi.useFakeTimers();
    const { root, toggle, cards, announcer, scope } = createFilteredCollectionFixture();
    const globalWithWindow = globalThis as unknown as { window: Window };
    const windowValue = globalWithWindow.window;
    const fakeWindow = Object.create(null) as Window;
    const mediaQueryList = {
      matches: false,
      media: '',
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    } as MediaQueryList;
    Object.defineProperty(fakeWindow, 'matchMedia', {
      value: vi.fn(() => mediaQueryList),
    });
    globalWithWindow.window = fakeWindow;

    try {
      initializeFilteredCollections(scope as unknown as ParentNode);

      expect(root.dataset.filteredCollectionInitialized).toBe('true');
      expect(cards.slice(0, 6).every((card) => !card.hidden)).toBe(true);
      expect(cards[6]?.hidden).toBe(true);
      expect(toggle.textContent).toBe('Show more');
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      expect(announcer.textContent).toBe('Showing 7 projects');

      toggle.click();
      vi.runAllTimers();

      expect(cards.every((card) => !card.hidden)).toBe(true);
      expect(toggle.textContent).toBe('Show less');
      expect(toggle.getAttribute('aria-expanded')).toBe('true');
    } finally {
      globalWithWindow.window = windowValue;
      vi.useRealTimers();
    }
  });
});
