import { videos as videosData, getTranslations } from '../data/loaders';
import { visibleEntries } from '../data/visibility';
import { flattenForLocale } from '../i18n/load';
import type { Locale } from '../config/locales';

/**
 * A short video about one demo. The title, links and stack come from the demo
 * registry (`getDemo`); this only carries the film, its credit and its text
 * alternative. Paths are site-absolute: prefix them with BASE_URL when rendering.
 */
export interface DemoVideo {
  /** Slug of the demo this video belongs to. */
  demo: string;
  video: string;
  poster: string;
  seconds: number;
  /** What happens on screen, for people who cannot see it. */
  description: string;
  /** CC BY credit for the soundtrack. Printed wherever the video is shown. */
  music: {
    title: string;
    artist: string;
    artistUrl: string;
    license: string;
    licenseUrl: string;
  };
  hidden?: boolean;
}

/** Videos for a locale, in file order, minus any marked hidden. */
export function listDemoVideos(lang: Locale): DemoVideo[] {
  return visibleEntries(
    flattenForLocale<DemoVideo>(videosData as never, lang, getTranslations('videos', lang))
  );
}

/** The video for a demo slug, or undefined when that demo has none. */
export function getDemoVideo(slug: string, lang: Locale): DemoVideo | undefined {
  return listDemoVideos(lang).find((v) => v.demo === slug);
}

/** 21 -> "0:21". Videos are capped at two minutes, so minutes never go past 1. */
export function formatVideoLength(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
