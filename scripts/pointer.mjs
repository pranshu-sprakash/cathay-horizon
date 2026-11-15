// macOS-style arrow pointer with its hotspot at the tip, plus a soft ripple on click.
export const POINTER = `(() => {
  const S = 1.45;
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + 20 * S + '" height="' + 28 * S + '" viewBox="0 0 20 28">' +
    '<path d="M1.5 1.5 L1.5 22.5 L6.6 17.6 L10.2 25.8 L13.6 24.3 L10.1 16.3 L17.2 16.3 Z" fill="#000" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  const place = (c, x, y) => { c.style.transform = 'translate(' + (x - 1.5 * S) + 'px,' + (y - 1.5 * S) + 'px)'; };
  addEventListener('DOMContentLoaded', () => {
    const c = document.createElement('div');
    c.id = '__pointer';
    c.innerHTML = svg;
    Object.assign(c.style, { position: 'fixed', left: 0, top: 0, zIndex: 2147483647, pointerEvents: 'none', filter: 'drop-shadow(0 1px 1.5px rgba(0,0,0,.35))' });
    document.documentElement.appendChild(c);
    const last = JSON.parse(sessionStorage.getItem('__ptr') || '[-60,-60]');
    place(c, last[0], last[1]);
    addEventListener('mousemove', (e) => { place(c, e.clientX, e.clientY); sessionStorage.setItem('__ptr', JSON.stringify([e.clientX, e.clientY])); }, true);
    addEventListener('mousedown', (e) => {
      const r = document.createElement('div');
      Object.assign(r.style, { position: 'fixed', left: e.clientX - 22 + 'px', top: e.clientY - 22 + 'px', width: '44px', height: '44px', borderRadius: '50%',
        border: '2px solid rgba(255,255,255,.9)', background: 'rgba(0,101,100,.18)', boxShadow: '0 0 0 1px rgba(0,0,0,.18)', pointerEvents: 'none', zIndex: 2147483646 });
      document.documentElement.appendChild(r);
      r.animate([{ transform: 'scale(.35)', opacity: 0.95 }, { transform: 'scale(1.25)', opacity: 0 }], { duration: 520, easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = () => r.remove();
    }, true);
  });
})();`
