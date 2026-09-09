import type { DemoModule } from './demo-dispatch';

export function loadDemoModules<Component>(): Record<string, DemoModule<Component>> {
  return import.meta.glob<DemoModule<Component>>('../pages/demos/*.astro', {
    eager: true,
  });
}
