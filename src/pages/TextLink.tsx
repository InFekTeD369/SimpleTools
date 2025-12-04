import { createSignal, onMount } from 'solid-js';
import type { Component } from 'solid-js';
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import styles from './TextLink.module.css';

const encodeBase64Url = (bytes: Uint8Array) => {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const decodeBase64Url = (input: string) => {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const encryptText = async (plain: string) => {
  const compressed = compressToEncodedURIComponent(plain);
  const enc = new TextEncoder();
  const data = enc.encode(compressed);
  const keyBytes = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']);
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
  const token = [
    encodeBase64Url(keyBytes),
    encodeBase64Url(iv),
    encodeBase64Url(new Uint8Array(cipher)),
  ].join('.');
  return token;
};

const encryptTextWithPassword = async (plain: string, password: string) => {
  const compressed = compressToEncodedURIComponent(plain);
  const enc = new TextEncoder();
  const data = enc.encode(compressed);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt'],
  );
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
  const token = [
    'pw',
    encodeBase64Url(salt),
    encodeBase64Url(iv),
    encodeBase64Url(new Uint8Array(cipher)),
  ].join('.');
  return token;
};

const decryptText = async (token: string) => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return '';
    const [k, v, c] = parts;
    const keyBytes = decodeBase64Url(k);
    const iv = decodeBase64Url(v);
    const cipherBytes = decodeBase64Url(c);
    const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['decrypt']);
    const plainBuf = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      cipherBytes,
    );
    const dec = new TextDecoder();
    const compressed = dec.decode(plainBuf);
    const txt = decompressFromEncodedURIComponent(compressed) || '';
    return txt;
  } catch {
    return '';
  }
};

const decryptTextWithPassword = async (token: string, password: string) => {
  try {
    const parts = token.split('.');
    if (parts.length !== 4 || parts[0] !== 'pw') return '';
    const [, s, v, c] = parts;
    const salt = decodeBase64Url(s);
    const iv = decodeBase64Url(v);
    const cipherBytes = decodeBase64Url(c);
    const enc = new TextEncoder();
    const baseKey = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      'PBKDF2',
      false,
      ['deriveKey'],
    );
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt'],
    );
    const plainBuf = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      cipherBytes,
    );
    const dec = new TextDecoder();
    const compressed = dec.decode(plainBuf);
    const txt = decompressFromEncodedURIComponent(compressed) || '';
    return txt;
  } catch {
    return '';
  }
};

const TextLink: Component = () => {
  const [text, setText] = createSignal('');
  const [link, setLink] = createSignal('');
  const [status, setStatus] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [pendingToken, setPendingToken] = createSignal<string | null>(null);
  const [passwordAttempts, setPasswordAttempts] = createSignal(0);

  const generateLink = async () => {
    const value = text();
    if (!value) return;
    setStatus('Encoding…');
    const pwd = password().trim();
    const token = pwd ? await encryptTextWithPassword(value, pwd) : await encryptText(value);
    const url = `${window.location.origin}${window.location.pathname}#paste=${token}`;
    setLink(url);
    setStatus('Link generated and copied');
    navigator.clipboard?.writeText(url);
  };

  const loadFromHash = async () => {
    const hash = window.location.hash;
    const prefix = '#paste=';
    if (hash.startsWith(prefix)) {
      const token = hash.slice(prefix.length);
      if (token.startsWith('pw.')) {
        setPendingToken(token);
        setStatus('Welp, you need a password for that!');
        return;
      }
      const value = await decryptText(token);
      if (value) {
        setText(value);
        setStatus('Loaded from link');
      } else {
        setStatus('Could not decode link');
      }
    }
  };

  const tryPassword = async () => {
    const token = pendingToken();
    if (!token) return;
    const value = await decryptTextWithPassword(token, password());
    if (value) {
      setText(value);
      setStatus('Loaded from password link');
      setPendingToken(null);
      setPassword('');
      setPasswordAttempts(0);
      return;
    }
    const next = passwordAttempts() + 1;
    setPasswordAttempts(next);
    setStatus('Wrong password');
    if (next >= 3) {
      setPendingToken(null);
      setPassword('');
      setPasswordAttempts(0);
      window.location.hash = '';
      window.location.href = window.location.origin + window.location.pathname;
    }
  };

  onMount(() => {
    loadFromHash();
  });

  return (
    <div class={styles.container}>
      <div class={styles.content}>
        <div class={styles.column}>
          <div class={styles.toolbar}>
            <button class={styles.toolButton} onClick={generateLink}>
              Generate link
            </button>
          </div>
          <div class={styles.passwordRow}>
            <span>Password (optional)</span>
            <input
              class={styles.passwordInput}
              type="password"
              value={password()}
              onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
              placeholder="Leave blank for no password"
            />
          </div>
          <textarea
            class={styles.textarea}
            value={text()}
            onInput={(e) => setText((e.target as HTMLTextAreaElement).value)}
            placeholder="Paste or type text to share"
          />
        </div>
        <div class={styles.column}>
          <div class={styles.labelRow}>
            <span>Shareable link</span>
          </div>
          <input
            class={styles.smallInput}
            value={link()}
            readOnly
            onFocus={(e) => (e.target as HTMLInputElement).select()}
          />
          <div class={styles.stats}>{status()}</div>
        </div>
      </div>
      {pendingToken() && (
        <div class={styles.overlay} onClick={() => { setPendingToken(null); setPassword(''); }}>
          <div class={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 class={styles.modalTitle}>Welp, you need a password for that!</h3>
            <p class={styles.modalText}>
              This text link is protected. Enter the password to unlock it.
            </p>
            <div class={styles.passwordRow}>
              <input
                class={styles.passwordInput}
                type="password"
                value={password()}
                onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
                placeholder="Enter password"
              />
            </div>
            <div class={styles.modalButtons}>
              <button
                class={styles.toolButton}
                onClick={() => {
                  setPendingToken(null);
                  setPassword('');
                }}
              >
                Cancel
              </button>
              <button class={styles.toolButton} onClick={tryPassword}>
                Unlock
              </button>
            </div>
            <div class={styles.modalStatus}>{status()}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TextLink;


