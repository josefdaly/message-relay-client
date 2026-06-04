import { generateKeyPair, eciesEncrypt, eciesDecrypt } from '../crypto.js';

describe('ECIES', () => {
  test('encrypt/decrypt round trip', async () => {
    const { privateKeyJwk, publicKeyB64 } = await generateKeyPair();
    const ciphertext = await eciesEncrypt(publicKeyB64, 'hello world');
    const decrypted = await eciesDecrypt(privateKeyJwk, ciphertext);
    expect(decrypted).toBe('hello world');
  });

  test('decrypts JSON payloads', async () => {
    const { privateKeyJwk, publicKeyB64 } = await generateKeyPair();
    const payload = JSON.stringify({ type: 'msg', msgId: '123', text: 'hi' });
    const ciphertext = await eciesEncrypt(publicKeyB64, payload);
    const decrypted = await eciesDecrypt(privateKeyJwk, ciphertext);
    expect(JSON.parse(decrypted)).toEqual({ type: 'msg', msgId: '123', text: 'hi' });
  });

  test('each encryption produces unique ciphertext', async () => {
    const { publicKeyB64 } = await generateKeyPair();
    const ct1 = await eciesEncrypt(publicKeyB64, 'hello');
    const ct2 = await eciesEncrypt(publicKeyB64, 'hello');
    expect(ct1).not.toBe(ct2);
  });

  test('decrypt fails with wrong private key', async () => {
    const receiver = await generateKeyPair();
    const wrong = await generateKeyPair();
    const ciphertext = await eciesEncrypt(receiver.publicKeyB64, 'secret');
    await expect(eciesDecrypt(wrong.privateKeyJwk, ciphertext)).rejects.toThrow();
  });

  test('two parties derive same plaintext', async () => {
    const alice = await generateKeyPair();
    const bob = await generateKeyPair();
    const msg = 'hello bob';
    const ciphertext = await eciesEncrypt(bob.publicKeyB64, msg);
    const decrypted = await eciesDecrypt(bob.privateKeyJwk, ciphertext);
    expect(decrypted).toBe(msg);
  });
});
