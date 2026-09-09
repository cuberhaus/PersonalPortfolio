export type FilteredCollectionPresentation = {
  visibleCount: number;
  buttonVisible: boolean;
  expanded: boolean;
};

type PresentationOptions = {
  totalCount: number;
  isMobile: boolean;
  mobileShown: number;
  expanded: boolean;
};

export type FilteredCollectionConfig = {
  rootId: string;
  itemLabel: string;
  mobileBreakpoint: number;
};

const MOBILE_PAGE_SIZE = 3;
const DESKTOP_LIMIT = 6;
const FILTERED_COLLECTION_MARKERS = {
  grid: '[data-filtered-collection-grid]',
  card: '[data-filtered-collection-card]',
  filter: '[data-filtered-collection-filter]',
  toggle: '[data-filtered-collection-toggle]',
  announcer: '[data-filtered-collection-announcer]',
  toggleContainer: '[data-filtered-collection-toggle-container]',
} as const;

export function getFilteredCollectionPresentation({
  totalCount,
  isMobile,
  mobileShown,
  expanded,
}: PresentationOptions): FilteredCollectionPresentation {
  if (isMobile) {
    return {
      visibleCount: Math.min(mobileShown, totalCount),
      buttonVisible: totalCount > MOBILE_PAGE_SIZE,
      expanded: mobileShown >= totalCount,
    };
  }

  return {
    visibleCount: expanded ? totalCount : Math.min(DESKTOP_LIMIT, totalCount),
    buttonVisible: totalCount > DESKTOP_LIMIT,
    expanded,
  };
}

export function initializeFilteredCollection(config: FilteredCollectionConfig): void {
  const root = document.getElementById(config.rootId);
  const grid = root?.querySelector<HTMLElement>(FILTERED_COLLECTION_MARKERS.grid);
  if (!root || !grid || root.dataset.filteredCollectionInitialized) return;
  root.dataset.filteredCollectionInitialized = 'true';

  const button = root.querySelector<HTMLButtonElement>(FILTERED_COLLECTION_MARKERS.toggle);
  const filterButtons = [
    ...root.querySelectorAll<HTMLButtonElement>(FILTERED_COLLECTION_MARKERS.filter),
  ];
  const announcer = root.querySelector(FILTERED_COLLECTION_MARKERS.announcer);
  const toggleContainer = root.querySelector<HTMLElement>(
    FILTERED_COLLECTION_MARKERS.toggleContainer
  );
  const animationTimers = new Set<ReturnType<typeof setTimeout>>();
  let currentFilter = 'all';
  let mobileShown = MOBILE_PAGE_SIZE;

  const isMobile = () => window.matchMedia(`(max-width: ${config.mobileBreakpoint}px)`).matches;
  const getAllCards = () => [
    ...grid.querySelectorAll<HTMLElement>(FILTERED_COLLECTION_MARKERS.card),
  ];
  const getFilterValue = (element: HTMLElement) => element.dataset.filterValue ?? 'all';
  const getFilteredCards = () => {
    const cards = getAllCards();
    return currentFilter === 'all'
      ? cards
      : cards.filter((card) => getFilterValue(card) === currentFilter);
  };
  const clearAnimationTimers = () => {
    for (const timer of animationTimers) clearTimeout(timer);
    animationTimers.clear();
  };
  const setButton = (presentation: FilteredCollectionPresentation) => {
    if (!button) return;
    button.hidden = !presentation.buttonVisible;
    if (toggleContainer && toggleContainer !== button) {
      toggleContainer.hidden = !presentation.buttonVisible;
    }
    button.textContent = presentation.expanded
      ? (button.dataset.filteredCollectionLess ?? button.textContent)
      : (button.dataset.filteredCollectionMore ?? button.textContent);
    button.setAttribute('aria-expanded', String(presentation.expanded));
    button.classList.toggle('expanded', presentation.expanded);
  };
  const scrollToCollection = () => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    root.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  };
  const updateGrid = (animateFromIndex: number | null = null) => {
    clearAnimationTimers();
    const allCards = getAllCards();
    const filteredCards = getFilteredCards();
    const expanded = button?.classList.contains('expanded') ?? false;
    const presentation = getFilteredCollectionPresentation({
      totalCount: filteredCards.length,
      isMobile: isMobile(),
      mobileShown,
      expanded,
    });

    if (announcer) announcer.textContent = `Showing ${filteredCards.length} ${config.itemLabel}`;
    allCards.forEach((card) => {
      card.classList.remove('visible', 'mobile-hidden-demo', 'mobile-extra-demo', 'extra-demo');
      card.classList.add('hidden-demo');
    });
    filteredCards.slice(0, presentation.visibleCount).forEach((card, index) => {
      card.classList.remove('hidden-demo');
      if (animateFromIndex !== null && index >= animateFromIndex) {
        const timer = setTimeout(
          () => {
            animationTimers.delete(timer);
            card.classList.add('visible');
          },
          20 + (index - animateFromIndex) * 60
        );
        animationTimers.add(timer);
      } else {
        card.classList.add('visible');
      }
    });
    setButton(presentation);
  };

  filterButtons.forEach((filterButton) => {
    filterButton.addEventListener('click', () => {
      const filter = getFilterValue(filterButton);
      if (filter === currentFilter) return;
      currentFilter = filter;
      mobileShown = MOBILE_PAGE_SIZE;
      filterButtons.forEach((button) => {
        button.classList.toggle('active', button === filterButton);
        button.setAttribute('aria-pressed', String(button === filterButton));
      });
      if (button) button.classList.remove('expanded');
      updateGrid();
    });
  });

  button?.addEventListener('click', () => {
    if (!button) return;
    const filteredCards = getFilteredCards();
    if (isMobile()) {
      if (mobileShown >= filteredCards.length) {
        mobileShown = MOBILE_PAGE_SIZE;
        if (button) button.classList.remove('expanded');
        updateGrid();
        scrollToCollection();
        return;
      }
      const start = mobileShown;
      mobileShown = Math.min(mobileShown + MOBILE_PAGE_SIZE, filteredCards.length);
      updateGrid(start);
      return;
    }

    const expanded = !button.classList.contains('expanded');
    button.classList.toggle('expanded', expanded);
    updateGrid(expanded ? DESKTOP_LIMIT : null);
    if (!expanded) scrollToCollection();
  });

  const activeFilter = filterButtons.find((filterButton) =>
    filterButton.classList.contains('active')
  );
  currentFilter = activeFilter ? getFilterValue(activeFilter) : 'all';
  updateGrid();
}
