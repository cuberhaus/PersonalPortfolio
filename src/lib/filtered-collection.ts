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
  gridId: string;
  cardSelector: string;
  filterSelector: string;
  filterValueAttribute: string;
  buttonId: string;
  announcerId: string;
  sectionId: string;
  showMoreAttribute: string;
  showLessAttribute: string;
  itemLabel: string;
  mobileBreakpoint: number;
  buttonDisplay: 'block' | 'inline-block';
};

const MOBILE_PAGE_SIZE = 3;
const DESKTOP_LIMIT = 6;

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
  const grid = document.getElementById(config.gridId);
  if (!grid || grid.dataset.filteredCollectionInitialized) return;
  grid.dataset.filteredCollectionInitialized = 'true';

  const button = document.getElementById(config.buttonId) as HTMLButtonElement | null;
  const filterButtons = [...document.querySelectorAll<HTMLButtonElement>(config.filterSelector)];
  const announcer = document.getElementById(config.announcerId);
  let currentFilter = 'all';
  let mobileShown = MOBILE_PAGE_SIZE;

  const isMobile = () => window.matchMedia(`(max-width: ${config.mobileBreakpoint}px)`).matches;
  const getAllCards = () => [...grid.querySelectorAll<HTMLElement>(config.cardSelector)];
  const getFilteredCards = () => {
    const cards = getAllCards();
    return currentFilter === 'all'
      ? cards
      : cards.filter((card) => card.getAttribute(config.filterValueAttribute) === currentFilter);
  };
  const setButton = (presentation: FilteredCollectionPresentation) => {
    if (!button) return;
    button.style.display = presentation.buttonVisible ? config.buttonDisplay : 'none';
    button.textContent = button.getAttribute(
      presentation.expanded ? config.showLessAttribute : config.showMoreAttribute
    );
    button.setAttribute('aria-expanded', String(presentation.expanded));
    button.classList.toggle('expanded', presentation.expanded);
  };
  const scrollToCollection = () => {
    const section = document.getElementById(config.sectionId);
    if (!section) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    section.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  };
  const updateGrid = () => {
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
    filteredCards.slice(0, presentation.visibleCount).forEach((card) => {
      card.classList.remove('hidden-demo');
      card.classList.add('visible');
    });
    setButton(presentation);
  };

  filterButtons.forEach((filterButton) => {
    filterButton.addEventListener('click', () => {
      const filter = filterButton.getAttribute(config.filterValueAttribute) ?? 'all';
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
      filteredCards.slice(start, mobileShown).forEach((card, index) => {
        card.classList.remove('hidden-demo');
        setTimeout(() => card.classList.add('visible'), 20 + index * 60);
      });
      updateGrid();
      return;
    }

    const expanded = button.classList.toggle('expanded');
    filteredCards.slice(DESKTOP_LIMIT).forEach((card, index) => {
      if (expanded) {
        card.classList.remove('hidden-demo');
        setTimeout(() => card.classList.add('visible'), 20 + index * 60);
      } else {
        card.classList.remove('visible');
        setTimeout(() => card.classList.add('hidden-demo'), 400);
      }
    });
    updateGrid();
    if (!expanded) scrollToCollection();
  });

  updateGrid();
}
