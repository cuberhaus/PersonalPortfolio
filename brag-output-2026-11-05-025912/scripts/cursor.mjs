// Injected into the page: a visible mouse cursor + click ring that live in the DOM so screenshots capture them.
export function cursorInit() {
    window.__cursor = { x: 1180, y: 640 };
    const boot = () => {
      const s = document.createElement('style');
      s.textContent = `astro-dev-toolbar{display:none!important} html{scroll-behavior:auto!important}
        #__cur{position:absolute;left:0;top:0;width:30px;height:30px;z-index:2147483647;pointer-events:none;filter:drop-shadow(0 2px 3px rgba(0,0,0,.55));will-change:transform}
        .__ring{position:absolute;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:50%;border:2px solid #fff;z-index:2147483646;pointer-events:none;animation:__r .55s ease-out forwards}
        @keyframes __r{from{transform:scale(.6);opacity:.95}to{transform:scale(3.6);opacity:0}}`;
      document.head.appendChild(s);
      const c = document.createElement('div');
      c.id = '__cur';
      c.innerHTML = '<svg viewBox="0 0 24 24" width="30" height="30"><path d="M3 2 L3 19 L7.4 15 L10.3 21.4 L13 20.2 L10.2 14 L16 14 Z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>';
      document.body.appendChild(c);
      const place = (x, y) => { window.__cursor = { x, y }; c.style.transform = `translate(${x + scrollX}px,${y + scrollY}px)`; };
      place(window.__cursor.x, window.__cursor.y);
      addEventListener('mousemove', (e) => place(e.clientX, e.clientY), true);
      addEventListener('scroll', () => place(window.__cursor.x, window.__cursor.y), true);
      addEventListener('mousedown', (e) => {
        const r = document.createElement('div'); r.className = '__ring';
        r.style.left = e.clientX + scrollX + 'px'; r.style.top = e.clientY + scrollY + 'px';
        document.body.appendChild(r); setTimeout(() => r.remove(), 700);
      }, true);
    };
    if (document.body) boot(); else document.addEventListener('DOMContentLoaded', boot);
  }
