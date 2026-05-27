export type Hideable = {
  hidden?: boolean;
};

export type SkillItem = string | ({ name: string } & Hideable);

export function isVisible(entry: Hideable): boolean {
  return entry.hidden !== true;
}

export function visibleEntries<T extends Hideable>(entries: readonly T[]): T[] {
  return entries.filter(isVisible);
}

function isVisibleSkillItem(item: SkillItem): boolean {
  return typeof item === 'string' || item.hidden !== true;
}

function skillItemName(item: SkillItem): string {
  return typeof item === 'string' ? item : item.name;
}

export function visibleSkillItems(items: readonly SkillItem[]): string[] {
  return items.filter(isVisibleSkillItem).map(skillItemName);
}
