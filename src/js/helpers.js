export function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

export function fullTs(epoch) {
  return new Date(epoch).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function shortTs(epoch) {
  return new Date(epoch).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function trunc(id) { return id.slice(0, 8) + '…' + id.slice(-4); }

let notifTimer;
export function notify(msg, color) {
  const el = document.getElementById('notif');
  el.textContent = msg;
  el.style.color = color || 'var(--bright)';
  el.style.display = 'block';
  clearTimeout(notifTimer);
  notifTimer = setTimeout(() => el.style.display = 'none', 2800);
}

export function copyText(text) {
  navigator.clipboard.writeText(text).then(() => notify('copied', 'var(--green)'));
}
