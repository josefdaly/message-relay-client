export async function generateKeyPair() {
  const kp = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']
  );
  const privateKeyJwk = await crypto.subtle.exportKey('jwk', kp.privateKey);
  const pubRaw = await crypto.subtle.exportKey('raw', kp.publicKey);
  const publicKeyB64 = btoa(String.fromCharCode(...new Uint8Array(pubRaw)));
  return { privateKeyJwk, publicKeyB64 };
}

export async function eciesEncrypt(recipientPublicKeyB64, plaintext) {
  const ephemeral = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']
  );
  const recipientPubRaw = Uint8Array.from(atob(recipientPublicKeyB64), c => c.charCodeAt(0));
  const recipientPublicKey = await crypto.subtle.importKey(
    'raw', recipientPubRaw, { name: 'ECDH', namedCurve: 'P-256' }, false, []
  );
  const aesKey = await crypto.subtle.deriveKey(
    { name: 'ECDH', public: recipientPublicKey },
    ephemeral.privateKey,
    { name: 'AES-GCM', length: 256 }, false, ['encrypt']
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, new TextEncoder().encode(plaintext));
  const ephPubRaw = await crypto.subtle.exportKey('raw', ephemeral.publicKey);
  // layout: ephemeral_pub (65) || iv (12) || ciphertext
  const combined = new Uint8Array(65 + 12 + ct.byteLength);
  combined.set(new Uint8Array(ephPubRaw), 0);
  combined.set(iv, 65);
  combined.set(new Uint8Array(ct), 77);
  return btoa(String.fromCharCode(...combined));
}

export async function eciesDecrypt(privateKeyJwk, b64) {
  const data = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const privateKey = await crypto.subtle.importKey(
    'jwk', privateKeyJwk, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveKey']
  );
  const ephPublicKey = await crypto.subtle.importKey(
    'raw', data.slice(0, 65), { name: 'ECDH', namedCurve: 'P-256' }, false, []
  );
  const aesKey = await crypto.subtle.deriveKey(
    { name: 'ECDH', public: ephPublicKey },
    privateKey,
    { name: 'AES-GCM', length: 256 }, false, ['decrypt']
  );
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: data.slice(65, 77) }, aesKey, data.slice(77)
  );
  return new TextDecoder().decode(pt);
}
