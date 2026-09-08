import type { Locale } from '../config/locales';
import { certifications, getTranslations } from '../data/loaders';

export type Certification = {
  id: string;
  displayOrder: number;
  name: string;
  issuer: string;
  issuerIcon: string;
  issued: string;
  link?: string;
  fallback?: string;
  badgeImage?: string;
  badgeImageFallback?: string;
  hidden?: boolean;
};

type CertificationIdentity = Omit<Certification, 'issued'>;

/** Return complete certification records in their curated display order. */
export function getLocalizedCertifications(locale: Locale): Certification[] {
  const translations = getTranslations('certifications', locale);

  return [...(certifications as CertificationIdentity[])]
    .sort(
      (left, right) => left.displayOrder - right.displayOrder || left.id.localeCompare(right.id)
    )
    .map((certification) => {
      const issued = translations[certification.id]?.issued;
      if (typeof issued !== 'string' || issued.length === 0) {
        throw new Error(`Missing certification translation for "${certification.id}" (${locale})`);
      }
      return { ...certification, issued };
    });
}
