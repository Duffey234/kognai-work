// Theme switch: follows the system until the person picks light or dark; the choice is kept on this device only.
(function () {
  var root = document.documentElement;
  var saved = null;
  try { saved = localStorage.getItem('citizen-theme'); } catch (e) {}
  if (saved === 'light' || saved === 'dark') root.setAttribute('data-theme', saved);
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('[data-set-theme]');
    if (!b) return;
    var t = b.getAttribute('data-set-theme');
    if (t === 'system') { root.removeAttribute('data-theme'); try { localStorage.removeItem('citizen-theme'); } catch (e) {} }
    else { root.setAttribute('data-theme', t); try { localStorage.setItem('citizen-theme', t); } catch (e) {} }
  });
})();
