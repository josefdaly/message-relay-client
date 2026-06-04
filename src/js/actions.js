import { SERVER } from './config.js';
import { LS } from './storage.js';
import { state } from './state.js';
import { generateKeyPair, eciesEncrypt } from './crypto.js';
import { notify } from './helpers.js';
import { renderChatList, renderChatView, openChat } from './render.js';

export function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('collapsed');
}

export function toggleGroupFields() {
  const isGroup = document.getElementById('new-chat-group').checked;
  document.getElementById('new-chat-myname').style.display = isGroup ? 'block' : 'none';
}

export function toggleNewChatForm(show) {
  const form = document.getElementById('new-chat-form');
  const visible = show !== undefined ? show : form.style.display === 'none';
  form.style.display = visible ? 'flex' : 'none';
  if (visible) {
    setTimeout(() => document.getElementById('new-chat-name')?.focus(), 0);
  } else {
    document.getElementById('new-chat-name').value = '';
    document.getElementById('new-chat-group').checked = false;
    document.getElementById('new-chat-myname').value = '';
    document.getElementById('new-chat-myname').style.display = 'none';
  }
}

export async function newChat() {
  const nameEl   = document.getElementById('new-chat-name');
  const isGroup  = document.getElementById('new-chat-group').checked;
  const myNameEl = document.getElementById('new-chat-myname');
  const name     = nameEl?.value.trim();
  const myName   = myNameEl?.value.trim();
  if (!name) return;
  if (isGroup && !myName) { notify('enter your name for the group', 'var(--red)'); myNameEl.focus(); return; }

  try {
    const [res, { privateKeyJwk, publicKeyB64 }] = await Promise.all([
      fetch(`${SERVER}/queue`, { method: 'POST' }),
      generateKeyPair(),
    ]);
    if (!res.ok) throw new Error('server error');
    const { sender_id, recipient_id } = await res.json();

    const chatId = crypto.randomUUID();
    const s = LS.load();

    if (isGroup) {
      s.chats.push({
        id: chatId, name, type: 'group', myName,
        rid: recipient_id, sid: sender_id,
        privateKeyJwk, publicKeyB64,
        members: [],
        createdAt: Date.now(),
      });
    } else {
      s.chats.push({
        id: chatId, name, type: 'direct',
        rid: recipient_id, sid: sender_id,
        counterSid: null, privateKeyJwk, publicKeyB64,
        createdAt: Date.now(),
      });
    }
    LS.save(s);

    toggleNewChatForm(false);
    openChat(chatId);
    notify(`chat "${name}" created`, 'var(--green)');
  } catch (e) {
    notify('failed: ' + e.message, 'var(--red)');
  }
}

export async function sendMessage() {
  const s = LS.load();
  const chat = s.chats.find(c => c.id === state.currentChatId);

  const input = document.getElementById('msg-input');
  const text  = input?.value.trim();
  if (!text) return;

  try {
    if (chat.type === 'group') {
      if (!chat.members.length) return;
      const payload = JSON.stringify({ from: chat.myName, text });
      await Promise.all(chat.members.map(async member => {
        const encrypted = await eciesEncrypt(member.publicKeyB64, payload);
        const res = await fetch(`${SERVER}/send/${member.sid}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: encrypted }),
        });
        if (!res.ok) throw new Error(`failed to send to ${member.knownAs || member.sid}`);
      }));
      if (!s.messages[chat.id]) s.messages[chat.id] = [];
      s.messages[chat.id].push({ text, ts: Date.now(), dir: 'out' });
    } else {
      if (!chat.counterSid) return;
      let msgId = null;
      let sendPayload;
      if (chat.theirPublicKeyB64) {
        msgId = crypto.randomUUID();
        sendPayload = await eciesEncrypt(chat.theirPublicKeyB64, JSON.stringify({ type: 'msg', msgId, text }));
      } else {
        sendPayload = text;
      }
      const res = await fetch(`${SERVER}/send/${chat.counterSid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: sendPayload }),
      });
      if (!res.ok) throw new Error((await res.json()).error || res.status);
      if (!s.messages[chat.id]) s.messages[chat.id] = [];
      s.messages[chat.id].push({ text, ts: Date.now(), dir: 'out', ...(msgId && { msgId, delivered: false }) });
    }

    LS.save(s);
    input.value = '';
    renderChatList();
    renderChatView();
  } catch (e) {
    notify('send failed: ' + e.message, 'var(--red)');
  }
}

export function addCounterSid(chatId) {
  const input = document.getElementById('counter-sid-input');
  const raw   = input?.value.trim();
  if (!raw) return;

  const s    = LS.load();
  const chat = s.chats.find(c => c.id === chatId);
  if (!chat) return;

  const [sid, theirPubKeyB64] = raw.split('|');
  chat.counterSid        = sid;
  chat.theirPublicKeyB64 = theirPubKeyB64 || null;

  LS.save(s);
  renderChatView();
  notify(theirPubKeyB64 ? 'outbound enabled (e2e encrypted)' : 'outbound enabled', 'var(--green)');
}

export function toggleAddMemberForm() {
  const form = document.getElementById('add-member-form');
  if (!form) return;
  const visible = form.style.display === 'none';
  form.style.display = visible ? 'flex' : 'none';
  if (visible) setTimeout(() => document.getElementById('add-member-key')?.focus(), 0);
}

export function addGroupMember(chatId) {
  const keyEl = document.getElementById('add-member-key');
  const raw   = keyEl?.value.trim();
  if (!raw) { notify('paste their sid|key', 'var(--red)'); return; }

  const [sid, publicKeyB64] = raw.split('|');
  if (!sid || !publicKeyB64) { notify('paste their full sid|key string', 'var(--red)'); return; }

  const s    = LS.load();
  const chat = s.chats.find(c => c.id === chatId);
  if (!chat) return;

  if (chat.members.some(m => m.sid === sid)) { notify('member already added', 'var(--yellow)'); return; }

  chat.members.push({ id: crypto.randomUUID(), sid, publicKeyB64 });
  LS.save(s);
  renderChatView();
  notify('member added', 'var(--green)');
}

export function toggleReadReceipts(chatId) {
  const s = LS.load();
  const chat = s.chats.find(c => c.id === chatId);
  if (!chat) return;
  chat.readReceipts = !chat.readReceipts;
  LS.save(s);
  notify(`read receipts ${chat.readReceipts ? 'on' : 'off'}`, 'var(--dim)');
}
