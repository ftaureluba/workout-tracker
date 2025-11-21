declare module 'web-push' {
  export function setVapidDetails(subject: string, publicKey: string, privateKey: string): void;

  export function sendNotification(subscription: unknown, payload?: string | object | ArrayBuffer, options?: unknown): Promise<unknown>;

  export function generateVAPIDKeys(): { publicKey: string; privateKey: string };

  const webpush: {
    setVapidDetails: typeof setVapidDetails;
    sendNotification: typeof sendNotification;
    generateVAPIDKeys: typeof generateVAPIDKeys;
  };

  export default webpush;
}
