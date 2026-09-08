import { describe, expect, it } from 'vitest';
import { getFilteredCollectionPresentation } from '../lib/filtered-collection';

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
