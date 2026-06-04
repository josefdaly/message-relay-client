export const LS = {
  load() {
    return {
      chats:    JSON.parse(localStorage.getItem('chats')    || '[]'),
      messages: JSON.parse(localStorage.getItem('messages') || '{}'),
    };
  },
  save(s) {
    localStorage.setItem('chats',    JSON.stringify(s.chats));
    localStorage.setItem('messages', JSON.stringify(s.messages));
  },
};
