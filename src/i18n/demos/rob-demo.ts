type Lang = 'en' | 'es' | 'ca';

export const T = {
  en: {
    mobileTitle: 'Mobile Robot',
    mobileDesc: 'Differential-drive odometry — path from encoder data',
    wallTitle: 'Wall Following',
    wallDesc: 'Reactive controller with k1/k2/k3 gains',
    armTitle: 'Robot Arm FK',
    armDesc: '3-Link forward kinematics — drag sliders to move joints',
  },
  es: {
    mobileTitle: 'Robot Móvil',
    mobileDesc: 'Odometría diferencial — trayectoria desde encoders',
    wallTitle: 'Seguimiento de Paredes',
    wallDesc: 'Controlador reactivo con ganancias k1/k2/k3',
    armTitle: 'Cinemática Directa',
    armDesc: '3-Link FK — arrastra los sliders para mover articulaciones',
  },
  ca: {
    mobileTitle: 'Robot Mòbil',
    mobileDesc: 'Odometria diferencial — trajectòria des d\'encoders',
    wallTitle: 'Seguiment de Parets',
    wallDesc: 'Controlador reactiu amb guanys k1/k2/k3',
    armTitle: 'Cinemàtica Directa',
    armDesc: '3-Link FK — arrossega els sliders per moure articulacions',
  },
};

export type DemoTranslations = typeof T[Lang];
