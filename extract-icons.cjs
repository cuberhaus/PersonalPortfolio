const lucide = require('lucide-react');

const iconsToExtract = {
  gamepad: 'Gamepad2',
  tree: 'TreePine',
  music: 'Music',
  store: 'Store',
  heart: 'Heart',
  camera: 'Camera',
  graph: 'Network',
  scatter: 'ScatterChart',
  map: 'Map',
  helicopter: 'Helicopter',
  aorta: 'Activity', // or HeartPulse
  ml: 'BrainCircuit',
  microscope: 'Microscope',
  server: 'Server',
  search: 'Search',
  cpu: 'Cpu',
  users: 'Users',
  bot: 'Bot',
  cube: 'Box',
  brain: 'Brain',
};

const getPath = (name) => {
  const icon = lucide[name];
  if (!icon) return 'NOT_FOUND: ' + name;
  return icon[2]
    .map((node) => {
      const [tag, attrs] = node;
      return `<${tag} ${Object.entries(attrs)
        .map(([k, v]) => `${k}="${v}"`)
        .join(' ')}/>`;
    })
    .join('');
};

const result = {};
for (const [key, lucideName] of Object.entries(iconsToExtract)) {
  result[key] = getPath(lucideName);
}

console.log(JSON.stringify(result, null, 2));
