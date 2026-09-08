import type { Locale } from '../config/locales';
import { certifications, getTranslations } from '../data/loaders';
import { getIssuerAttribution, type IssuerId } from './issuer-icons';

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

type CertificationIdentity = Omit<Certification, 'issued' | 'issuerIcon'> & { issuer: IssuerId };

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
      const attribution = getIssuerAttribution(certification.issuer);
      return {
        ...certification,
        issuer: attribution.name,
        issuerIcon: attribution.icon,
        issued,
      };
    });
}
