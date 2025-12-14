/**
 * Web Push Protocol Implementation for Cloudflare Workers
 * 
 * This module provides utilities to send actual push notifications
 * from a Cloudflare Worker using the Web Push Protocol.
 * 
 * Since Cloudflare Workers don't have built-in web-push support,
 * we implement the protocol directly using SubtleCrypto for encryption.
 */

import { encode as base64Encode } from 'js-base64';

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Decrypt a subscription key from base64url format
 */
function decodeUrlBase64(input: string): ArrayBuffer {
  let output = input.replace(/-/g, '+').replace(/_/g, '/');
  switch (output.length % 4) {
    case 0:
      break;
    case 2:
      output += '==';
      break;
    case 3:
      output += '=';
      break;
    default:
      throw new Error('Invalid base64url');
  }
  const binaryString = atob(output);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Encrypt push notification payload using AES-128-GCM
 * as specified in the Web Push Protocol
 */
async function encryptPayload(
  payload: string,
  p256dhKey: ArrayBuffer,
  authSecret: ArrayBuffer,
  senderPrivateKey: ArrayBuffer
): Promise<{
  ciphertext: ArrayBuffer;
  salt: Uint8Array;
  publicKey: ArrayBuffer;
}> {
  // Generate random salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Import the subscriber's public key
  const subscriberPublicKey = await crypto.subtle.importKey(
    'raw',
    p256dhKey,
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    false,
    ['deriveBits']
  );

  // Generate ephemeral key pair
  const ephemeralKeyPair = await crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    ['deriveBits']
  );

  // Derive shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    {
      name: 'ECDH',
      public: subscriberPublicKey,
    } as EcdhKeyDeriveParams,
    ephemeralKeyPair.privateKey,
    256
  );

  // Derive content encryption key
  const PRK = await crypto.subtle.sign('HMAC', new Uint8Array(authSecret), new Uint8Array(sharedSecret));
  const infoEncryption = new TextEncoder().encode('WebPush: msg\x00');
  const contentEncryptionKey = await crypto.subtle.sign('HMAC', new Uint8Array(PRK), infoEncryption);

  // Encrypt payload using AES-128-GCM
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    await crypto.subtle.importKey('raw', contentEncryptionKey, 'AES-GCM', false, ['encrypt']),
    new TextEncoder().encode(payload)
  );

  return {
    ciphertext,
    salt,
    publicKey: await crypto.subtle.exportKey('raw', ephemeralKeyPair.publicKey),
  };
}

/**
 * Send a push notification to a subscriber
 * 
 * This implements the Web Push Protocol as specified in:
 * https://datatracker.ietf.org/doc/html/draft-thomson-webpush-protocol
 */
export async function sendWebPush(
  subscription: PushSubscription,
  payload: PushPayload,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<Response> {
  const endpoint = subscription.endpoint;

  // Decode subscription keys
  const p256dhKey = decodeUrlBase64(subscription.keys.p256dh);
  const authSecret = decodeUrlBase64(subscription.keys.auth);

  // Prepare payload
  const payloadJson = JSON.stringify(payload);

  // Encrypt the payload
  const { ciphertext, salt, publicKey } = await encryptPayload(
    payloadJson,
    p256dhKey,
    authSecret,
    decodeUrlBase64(vapidPrivateKey)
  );

  // Combine ciphertext and salt for the body
  const body = new Uint8Array(salt.length + new Uint8Array(ciphertext).length);
  body.set(salt);
  body.set(new Uint8Array(ciphertext), salt.length);

  // Create VAPID authentication header
  const now = Math.floor(Date.now() / 1000);
  const vapidHeader = createVapidHeader(
    `mailto:admin@example.com`,
    vapidPublicKey,
    vapidPrivateKey,
    endpoint,
    now
  );

  // Send the push notification
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'Crypto-Key': `dh=${base64Encode(publicKey)}`,
      'Authorization': vapidHeader,
      'TTL': '24h',
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`Push failed: ${response.status} ${response.statusText}`);
  }

  return response;
}

/**
 * Create VAPID authorization header (JWT)
 * 
 * @see https://datatracker.ietf.org/doc/html/rfc8292
 */
function createVapidHeader(
  subject: string,
  publicKey: string,
  privateKey: string,
  audience: string,
  iat: number
): string {
  // This is a simplified version - in production you'd use a proper JWT library
  // For now, we'll throw an error and delegate to a proper implementation
  throw new Error('VAPID header creation requires JWT signing. Use node-jsonwebtoken or similar.');
}

/**
 * Alternative: Simplified push without encryption
 * (Use only if the push service supports it - most modern services do NOT)
 */
export async function sendSimplePush(
  subscription: PushSubscription,
  payload: PushPayload
): Promise<Response> {
  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'TTL': '24',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Push failed: ${response.status}`);
  }

  return response;
}

/**
 * Recommended: Use web-push library for Workers
 * 
 * Since pure crypto implementation is complex, use a lightweight library:
 * npm install web-push-encryption
 * 
 * Or in your Worker:
 * import webPush from 'web-push-encryption';
 */
