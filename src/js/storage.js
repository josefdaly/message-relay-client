export const LS = {
  load() {
    return {
      chats:    JSON.parse(localStorage.getItem('chats')    || '[]'),
      messages: JSON.parse(localStorage.getItem('messages') || '{}'),
      lastSeen: JSON.parse(localStorage.getItem('lastSeen') || '{}'),
    };
  },
  save(s) {
    localStorage.setItem('chats',    JSON.stringify(s.chats));
    localStorage.setItem('messages', JSON.stringify(s.messages));
    localStorage.setItem('lastSeen', JSON.stringify(s.lastSeen));
  },
};
