export type DemoModule<Component> = { default: Component };

export function getDemoSlugFromPath(path: string): string | null {
  const match = path.match(/\/([^/]+)\.astro$/);
  return match?.[1] ?? null;
}

export function createDemoModuleLookup<Component>(
  modules: Record<string, DemoModule<Component>>
): Readonly<Record<string, Component>> {
  return Object.fromEntries(
    Object.entries(modules).flatMap(([path, module]) => {
      const slug = getDemoSlugFromPath(path);
      return slug ? [[slug, module.default]] : [];
    })
  );
}

export function listDemoSlugs<Component>(modules: Record<string, DemoModule<Component>>): string[] {
  return Object.keys(createDemoModuleLookup(modules));
}
