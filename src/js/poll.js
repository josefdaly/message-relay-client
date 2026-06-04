import { SERVER } from './config.js';
import { LS } from './storage.js';
import { state } from './state.js';
import { eciesDecrypt, eciesEncrypt } from './crypto.js';
import { notify } from './helpers.js';
import { renderChatList, renderChatView } from './render.js';

export async function sendAck(chat, msgIds) {
  try {
    const encrypted = await eciesEncrypt(chat.theirPublicKeyB64, JSON.stringify({ type: 'ack', msgIds }));
    await fetch(`${SERVER}/send/${chat.counterSid}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: encrypted }),
    });
  } catch (_) {}
}

export async function pollAll() {
  const s = LS.load();
  let newCount = 0;
  let ackCount = 0;

  for (const chat of s.chats) {
    try {
      const res = await fetch(`${SERVER}/receive/${chat.rid}/drain`);
      if (!res.ok) continue;
      const { messages } = await res.json();
      if (messages?.length) {
        if (!s.messages[chat.id]) s.messages[chat.id] = [];
        const incomingMsgIds = [];
        for (const raw of messages) {
          let text = raw;
          let from = null;
          let msgId = null;
          let isAck = false;
          if (chat.privateKeyJwk) {
            try {
              const decrypted = await eciesDecrypt(chat.privateKeyJwk, raw);
              try {
                const parsed = JSON.parse(decrypted);
                if (parsed.type === 'ack' && parsed.msgIds) {
                  for (const id of parsed.msgIds) {
                    const m = (s.messages[chat.id] || []).find(m => m.msgId === id);
                    if (m) m.delivered = true;
                  }
                  isAck = true; ackCount++;
                } else if (parsed.type === 'msg') {
                  text = parsed.text; msgId = parsed.msgId || null;
                } else if (parsed.from && parsed.text) {
                  from = parsed.from; text = parsed.text;
                } else { text = decrypted; }
              } catch { text = decrypted; }
            } catch { text = '[decryption failed]'; }
          }
          if (isAck) continue;
          if (msgId) incomingMsgIds.push(msgId);
          if (from && chat.type === 'group') {
            const member = chat.members.find(m => !m.knownAs);
            if (member && !chat.members.some(m => m.knownAs === from)) member.knownAs = from;
          }
          s.messages[chat.id].push({ text, from, ts: Date.now(), dir: 'in', msgId });
          newCount++;
        }
        if (chat.readReceipts && chat.counterSid && chat.theirPublicKeyB64 && incomingMsgIds.length) {
          sendAck(chat, incomingMsgIds);
        }
      }
    } catch (_) {}
  }

  if (newCount || ackCount) {
    LS.save(s);
    if (state.currentChatId) renderChatView();
    if (newCount) {
      renderChatList();
      notify(`${newCount} new message${newCount > 1 ? 's' : ''}`, 'var(--accent)');
    }
  }

  document.getElementById('poll-status').textContent =
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
