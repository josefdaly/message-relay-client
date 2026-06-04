import { vi, beforeEach } from 'vitest';
import { LS } from '../storage.js';

describe('LS', () => {
  let store = {};

  beforeEach(() => {
    store = {};
    vi.stubGlobal('localStorage', {
      getItem:  (k) => store[k] ?? null,
      setItem:  (k, v) => { store[k] = String(v); },
    });
  });

  test('load returns empty defaults', () => {
    const { chats, messages } = LS.load();
    expect(chats).toEqual([]);
    expect(messages).toEqual({});
  });

  test('save and load round trip', () => {
    const data = {
      chats: [{ id: '1', name: 'test', type: 'direct' }],
      messages: { '1': [{ text: 'hi', dir: 'out', ts: 0 }] },
    };
    LS.save(data);
    expect(LS.load()).toEqual(data);
  });

  test('save overwrites previous data', () => {
    LS.save({ chats: [{ id: '1', name: 'first' }], messages: {} });
    LS.save({ chats: [{ id: '2', name: 'second' }], messages: {} });
    expect(LS.load().chats).toHaveLength(1);
    expect(LS.load().chats[0].name).toBe('second');
  });
});
