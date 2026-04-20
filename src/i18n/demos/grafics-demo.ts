type Lang = 'en' | 'es' | 'ca';

export const T = {
  en: {
    waveTitle: 'Vertex Wave',
    waveDesc: 'Sinusoidal rotation-matrix deformation driven by time',
    phongTitle: 'Phong Lighting',
    phongDesc: 'Ambient + diffuse + specular per-fragment shading',
    checkerTitle: 'Checkerboard',
    checkerDesc: 'Procedural pattern via UV modular arithmetic',
    explodeTitle: 'Explode',
    explodeDesc: 'Triangle displacement along face normals',
  },
  es: {
    waveTitle: 'Onda de Vértices',
    waveDesc: 'Deformación sinusoidal con matriz de rotación',
    phongTitle: 'Iluminación Phong',
    phongDesc: 'Sombreado ambiental + difuso + especular por fragmento',
    checkerTitle: 'Tablero de Ajedrez',
    checkerDesc: 'Patrón procedural mediante aritmética modular UV',
    explodeTitle: 'Explosión',
    explodeDesc: 'Desplazamiento de triángulos a lo largo de normales',
  },
  ca: {
    waveTitle: 'Ona de Vèrtexs',
    waveDesc: 'Deformació sinusoïdal amb matriu de rotació',
    phongTitle: 'Il·luminació Phong',
    phongDesc: 'Ombrejat ambiental + difús + especular per fragment',
    checkerTitle: 'Escaquer',
    checkerDesc: 'Patró procedural mitjançant aritmètica modular UV',
    explodeTitle: 'Explosió',
    explodeDesc: 'Desplaçament de triangles al llarg de normals',
  },
};

export type DemoTranslations = typeof T[Lang];
