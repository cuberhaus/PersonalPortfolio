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

const MOBILE_PAGE_SIZE = 3;
const DESKTOP_LIMIT = 6;

// Entrance for cards revealed by "Show more". Mirrors the scroll reveal in
// global.css (--reveal-distance / --reveal-duration / --reveal-step / --ease-out).
const REVEAL_DISTANCE_PX = 16;
const REVEAL_DURATION_MS = 420;
const REVEAL_STEP_MS = 50;
const REVEAL_MAX_STEPS = 5;
const REVEAL_EASING = 'cubic-bezier(0.23, 1, 0.32, 1)';

export function initializeFilteredCollections(scope: ParentNode = document): void {
  scope
    .querySelectorAll<HTMLElement>('[data-filtered-collection]')
    .forEach(initializeFilteredCollection);
}

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

export function initializeFilteredCollection(root: HTMLElement): void {
  const button = [...root.querySelectorAll<HTMLButtonElement>('button')].find(
    (candidate) => candidate.getAttribute('aria-controls') !== null
  );
  const gridId = button?.getAttribute('aria-controls');
  const grid = gridId ? root.ownerDocument.getElementById(gridId) : null;
  if (!root || !grid || root.dataset.filteredCollectionInitialized) return;
  if (!root.contains(grid)) return;
  root.dataset.filteredCollectionInitialized = 'true';

  const filterButtons = [...root.querySelectorAll<HTMLButtonElement>('button[data-filter-value]')];
  const announcer = root.querySelector<HTMLElement>('[aria-live="polite"]');
  const toggleContainer =
    button?.parentElement && button.parentElement.children.length === 1
      ? button.parentElement
      : button;
  const animations = new Set<Animation>();
  const itemLabel = root.dataset.itemLabel ?? '';
  const mobileBreakpoint = Number(root.dataset.mobileBreakpoint) || 640;
  const moreLabel = button?.dataset.moreLabel ?? '';
  const lessLabel = button?.dataset.lessLabel ?? '';
  let currentFilter = 'all';
  let mobileShown = MOBILE_PAGE_SIZE;

  const isMobile = () => window.matchMedia(`(max-width: ${mobileBreakpoint}px)`).matches;
  const getAllCards = () => [...grid.children].filter(isCollectionCard);
  const getFilterValue = (element: HTMLElement) => element.dataset.filterValue ?? 'all';
  const getFilteredCards = () => {
    const cards = getAllCards();
    return currentFilter === 'all'
      ? cards
      : cards.filter((card) => getFilterValue(card) === currentFilter);
  };
  const cancelAnimations = () => {
    for (const animation of animations) animation.cancel();
    animations.clear();
  };
  const setButton = (presentation: FilteredCollectionPresentation) => {
    if (!button) return;
    button.hidden = !presentation.buttonVisible;
    if (toggleContainer) toggleContainer.hidden = !presentation.buttonVisible;
    button.textContent = presentation.expanded ? lessLabel : moreLabel;
    button.setAttribute('aria-expanded', String(presentation.expanded));
  };
  const scrollToCollection = () => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    root.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  };
  const updateGrid = (animateFromIndex: number | null = null) => {
    cancelAnimations();
    const allCards = getAllCards();
    const filteredCards = getFilteredCards();
    const expanded = button?.getAttribute('aria-expanded') === 'true';
    const presentation = getFilteredCollectionPresentation({
      totalCount: filteredCards.length,
      isMobile: isMobile(),
      mobileShown,
      expanded,
    });

    if (announcer) announcer.textContent = `Showing ${filteredCards.length} ${itemLabel}`;
    allCards.forEach((card) => (card.hidden = true));
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    filteredCards.slice(0, presentation.visibleCount).forEach((card, index) => {
      card.hidden = false;
      if (animateFromIndex !== null && index >= animateFromIndex) {
        if (prefersReducedMotion || typeof card.animate !== 'function') return;
        // `delay` + `fill: 'backwards'` hold the card at its first keyframe from the
        // very first frame, so it never flashes fully visible before animating in, and
        // the card returns to its own styles afterwards (a forwards fill would pin
        // `transform` and silently disable the hover lift).
        const animation = card.animate(
          [
            { opacity: 0, transform: `translateY(${REVEAL_DISTANCE_PX}px)` },
            { opacity: 1, transform: 'translateY(0)' },
          ],
          {
            duration: REVEAL_DURATION_MS,
            delay: Math.min(index - animateFromIndex, REVEAL_MAX_STEPS) * REVEAL_STEP_MS,
            easing: REVEAL_EASING,
            fill: 'backwards',
          }
        );
        animations.add(animation);
        animation.addEventListener('finish', () => animations.delete(animation), {
          once: true,
        });
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

function isCollectionCard(value: Element): value is HTMLElement {
  return 'dataset' in value && 'hidden' in value;
}
