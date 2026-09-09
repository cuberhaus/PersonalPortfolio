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
  gridId: string;
  itemLabel: string;
  mobileBreakpoint: number;
  moreLabel: string;
  lessLabel: string;
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
  const root = document.getElementById(config.rootId);
  const grid = document.getElementById(config.gridId);
  if (!root || !grid || root.dataset.filteredCollectionInitialized) return;
  if (!root.contains(grid)) return;
  root.dataset.filteredCollectionInitialized = 'true';

  const button = [...root.querySelectorAll<HTMLButtonElement>('button')].find(
    (candidate) => candidate.getAttribute('aria-controls') === config.gridId
  );
  const filterButtons = [...root.querySelectorAll<HTMLButtonElement>('button[data-filter-value]')];
  const announcer = root.querySelector<HTMLElement>('[aria-live="polite"]');
  const toggleContainer =
    button?.parentElement && button.parentElement.children.length === 1
      ? button.parentElement
      : button;
  const animationTimers = new Set<ReturnType<typeof setTimeout>>();
  const animations = new Set<Animation>();
  let currentFilter = 'all';
  let mobileShown = MOBILE_PAGE_SIZE;

  const isMobile = () => window.matchMedia(`(max-width: ${config.mobileBreakpoint}px)`).matches;
  const getAllCards = () =>
    [...grid.children].filter((card): card is HTMLElement => card instanceof HTMLElement);
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
    for (const animation of animations) animation.cancel();
    animations.clear();
  };
  const setButton = (presentation: FilteredCollectionPresentation) => {
    if (!button) return;
    button.hidden = !presentation.buttonVisible;
    if (toggleContainer) toggleContainer.hidden = !presentation.buttonVisible;
    button.textContent = presentation.expanded ? config.lessLabel : config.moreLabel;
    button.setAttribute('aria-expanded', String(presentation.expanded));
  };
  const scrollToCollection = () => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    root.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  };
  const updateGrid = (animateFromIndex: number | null = null) => {
    clearAnimationTimers();
    const allCards = getAllCards();
    const filteredCards = getFilteredCards();
    const expanded = button?.getAttribute('aria-expanded') === 'true';
    const presentation = getFilteredCollectionPresentation({
      totalCount: filteredCards.length,
      isMobile: isMobile(),
      mobileShown,
      expanded,
    });

    if (announcer) announcer.textContent = `Showing ${filteredCards.length} ${config.itemLabel}`;
    allCards.forEach((card) => (card.hidden = true));
    filteredCards.slice(0, presentation.visibleCount).forEach((card, index) => {
      card.hidden = false;
      if (animateFromIndex !== null && index >= animateFromIndex) {
        const timer = setTimeout(
          () => {
            animationTimers.delete(timer);
            const prefersReducedMotion = window.matchMedia(
              '(prefers-reduced-motion: reduce)'
            ).matches;
            if (prefersReducedMotion || typeof card.animate !== 'function') return;
            const animation = card.animate(
              [
                { opacity: 0, transform: 'translateY(20px)' },
                { opacity: 1, transform: 'translateY(0)' },
              ],
              {
                duration: 400,
                easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
                fill: 'both',
              }
            );
            animations.add(animation);
            animation.addEventListener('finish', () => animations.delete(animation), {
              once: true,
            });
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
      button?.setAttribute('aria-expanded', 'false');
      updateGrid();
    });
  });

  button?.addEventListener('click', () => {
    if (!button) return;
    const filteredCards = getFilteredCards();
    if (isMobile()) {
      if (mobileShown >= filteredCards.length) {
        mobileShown = MOBILE_PAGE_SIZE;
        button.setAttribute('aria-expanded', 'false');
        updateGrid();
        scrollToCollection();
        return;
      }
      const start = mobileShown;
      mobileShown = Math.min(mobileShown + MOBILE_PAGE_SIZE, filteredCards.length);
      updateGrid(start);
      return;
    }

    const expanded = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(expanded));
    updateGrid(expanded ? DESKTOP_LIMIT : null);
    if (!expanded) scrollToCollection();
  });

  const activeFilter = filterButtons.find((filterButton) =>
    filterButton.classList.contains('active')
  );
  currentFilter = activeFilter ? getFilterValue(activeFilter) : 'all';
  updateGrid();
}
