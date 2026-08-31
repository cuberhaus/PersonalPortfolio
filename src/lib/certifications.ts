export type CertificationIdentity = Record<string, unknown> & {
  id: string;
  displayOrder: number;
};

export type CertificationTranslation = Record<string, unknown>;

/** Join ID-keyed translations and apply the curated display order. */
export function getLocalizedCertifications<T extends CertificationIdentity>(
  certifications: readonly T[],
  translations: Record<string, CertificationTranslation>
): Array<T & CertificationTranslation> {
  return [...certifications]
    .sort(
      (left, right) => left.displayOrder - right.displayOrder || left.id.localeCompare(right.id)
    )
    .map((certification) => ({ ...certification, ...(translations[certification.id] ?? {}) }));
}
