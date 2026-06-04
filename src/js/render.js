import { LS } from './storage.js';
import { state } from './state.js';
import { esc, fullTs, shortTs, trunc } from './helpers.js';

export function renderChatList() {
  const { chats, messages } = LS.load();
  const el = document.getElementById('chat-list');

  if (!chats.length) {
    el.innerHTML = '<div style="padding:12px 10px;color:var(--dim);font-size:11px">no chats — press + to start</div>';
    return;
  }

  el.innerHTML = chats.map(chat => {
    const msgs = messages[chat.id] || [];
    const last = msgs[msgs.length - 1];
    const active = chat.id === state.currentChatId ? ' active' : '';
    const prefix = chat.type === 'group' ? '# ' : '';
    const previewText = last
      ? (last.from ? `${last.from}: ` : (last.dir === 'out' ? '> ' : '< ')) + last.text.slice(0, 28)
      : null;
    const preview = previewText
      ? esc(previewText)
      : '<span style="font-style:italic">no messages</span>';
    return `<div class="chat-item${active}" onclick="openChat('${chat.id}')">
      <div class="chat-item-top">
        <span class="ci-name">${prefix}${esc(chat.name)}</span>
        ${last ? `<span class="ci-time">${shortTs(last.ts)}</span>` : ''}
      </div>
      <div class="ci-preview">${preview}</div>
    </div>`;
  }).join('');
}

export function openChat(id) {
  state.currentChatId = id;
  renderChatList();
  renderChatView();
}

export function renderChatView() {
  const { chats, messages } = LS.load();
  const chat = chats.find(c => c.id === state.currentChatId);

  if (!chat) {
    document.getElementById('empty-state').style.display = 'flex';
    document.getElementById('chat-view').style.display  = 'none';
    return;
  }

  document.getElementById('empty-state').style.display = 'none';
  document.getElementById('chat-view').style.display   = 'flex';

  const shareStr = chat.publicKeyB64 ? `${chat.sid}|${chat.publicKeyB64}` : chat.sid;

  if (chat.type === 'group') {
    renderGroupHeader(chat, shareStr);
  } else {
    renderDirectHeader(chat, shareStr, messages);
  }

  // messages
  const msgs = messages[chat.id] || [];
  const msgEl = document.getElementById('messages');
  const wasAtBottom = msgEl.scrollHeight - msgEl.scrollTop - msgEl.clientHeight < 40;

  if (!msgs.length) {
    msgEl.innerHTML = '<div class="no-msgs">no messages yet.</div>';
  } else {
    msgEl.innerHTML = msgs.map(m => {
      const nick = m.dir === 'out' ? 'you' : (m.from || chat.name);
      const deliveredMark = m.dir === 'out' && m.msgId
        ? `<span style="color:${m.delivered ? 'var(--green)' : 'var(--dim)'};font-size:10px;margin-left:5px">${m.delivered ? '✓' : '·'}</span>`
        : '';
      return `<div class="msg ${m.dir}">
        <span class="msg-ts">[${fullTs(m.ts)}]</span>
        <span class="msg-nick">&lt;${esc(nick)}&gt;</span>
        <span class="msg-sep">|</span>
        <span class="msg-txt">${esc(m.text)}${deliveredMark}</span>
      </div>`;
    }).join('');
  }

  if (wasAtBottom || msgs.length <= 1) msgEl.scrollTop = msgEl.scrollHeight;

  // compose
  const composeEl = document.getElementById('compose-area');
  if (chat.type === 'group') {
    if (chat.members.length > 0) {
      composeEl.innerHTML = `
        <div class="compose-row">
          <input type="text" id="msg-input" placeholder="message..." onkeydown="if(event.key==='Enter')sendMessage()">
          <button class="primary" onclick="sendMessage()">send</button>
        </div>`;
      setTimeout(() => document.getElementById('msg-input')?.focus(), 0);
    } else {
      composeEl.innerHTML = `
        <div class="compose-disabled">
          <span class="compose-disabled-hint">no members yet — add some above</span>
        </div>`;
    }
  } else {
    if (chat.counterSid) {
      composeEl.innerHTML = `
        <div class="compose-row">
          <input type="text" id="msg-input" placeholder="message..." onkeydown="if(event.key==='Enter')sendMessage()">
          <button class="primary" onclick="sendMessage()">send</button>
        </div>`;
      setTimeout(() => document.getElementById('msg-input')?.focus(), 0);
    } else {
      composeEl.innerHTML = `
        <div class="compose-disabled">
          <span class="compose-disabled-hint">outbound disabled —</span>
          <input type="text" id="counter-sid-input" placeholder="paste their sid|key to enable outbound...">
          <button onclick="addCounterSid('${chat.id}')">add</button>
        </div>`;
    }
  }
}

function renderDirectHeader(chat, shareStr, messages) {
  const encBadge = chat.theirPublicKeyB64
    ? '<span class="id-badge" style="color:var(--green);border-color:var(--green)">e2e</span>' : '';
  const rrDisabled = !chat.theirPublicKeyB64 ? 'disabled title="requires e2e encryption"' : '';
  const hasIncoming = (messages[chat.id] || []).some(m => m.dir === 'in');
  const shareSection = !hasIncoming ? `
      <div class="ch-id-group">
        <span class="id-badge sid">share to receive</span>
        <span class="id-val">${trunc(chat.sid)}</span>
        <button onclick="copyText('${shareStr.replace(/'/g, "\\'")}')">copy</button>
      </div>` : '';
  document.getElementById('chat-header').innerHTML = `
    <div class="ch-name">${esc(chat.name)} ${encBadge}</div>
    <div class="ch-ids">
      ${shareSection}
      <label style="display:flex;align-items:center;gap:5px;color:var(--dim);font-size:11px;cursor:pointer;flex-shrink:0;">
        <input type="checkbox" ${chat.readReceipts ? 'checked' : ''} ${rrDisabled} onchange="toggleReadReceipts('${chat.id}')"> read receipts
      </label>
    </div>`;
}

function renderGroupHeader(chat, shareStr) {
  const memberTags = chat.members.map(m =>
    `<span class="member-tag" title="${esc(m.sid)}">${esc(m.knownAs || trunc(m.sid))}</span>`
  ).join('');

  document.getElementById('chat-header').innerHTML = `
    <div class="ch-name">${esc(chat.name)} <span style="color:var(--dim);font-size:11px">group · ${chat.members.length}</span></div>
    <div class="ch-ids">
      <div class="ch-id-group">
        <span class="id-badge sid">share to join</span>
        <span class="id-val">${trunc(chat.sid)}</span>
        <button onclick="copyText('${shareStr.replace(/'/g, "\\'")}')">copy</button>
      </div>
      <button onclick="toggleAddMemberForm('${chat.id}')">+ add</button>
    </div>
    <div class="group-members">${memberTags}</div>
    <div id="add-member-form" style="display:none;" class="add-member-form">
      <input type="text" id="add-member-key" placeholder="their sid|key...">
      <div class="row">
        <button class="primary" onclick="addGroupMember('${chat.id}')" style="flex:1;">add</button>
        <button onclick="toggleAddMemberForm('${chat.id}')">cancel</button>
      </div>
    </div>`;
}
