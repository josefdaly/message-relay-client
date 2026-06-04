import { copyText } from './helpers.js';
import { renderChatList, openChat, renderChatView } from './render.js';
import {
  toggleSidebar, toggleGroupFields, toggleNewChatForm,
  newChat, sendMessage, addCounterSid,
  toggleAddMemberForm, addGroupMember, toggleReadReceipts,
} from './actions.js';
import { pollAll } from './poll.js';

// Expose functions called from inline HTML onclick attributes
Object.assign(window, {
  toggleSidebar, toggleGroupFields, toggleNewChatForm,
  newChat, sendMessage, addCounterSid,
  toggleAddMemberForm, addGroupMember, toggleReadReceipts,
  openChat, copyText,
});

setInterval(pollAll, 5000);
pollAll();
renderChatList();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js');
}
