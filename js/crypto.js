/**
 * Crypto helpers — password hashing using Web Crypto API (SHA-256)
 * No external library needed; runs natively in all modern browsers.
 */

const Crypto = {
  /**
   * Hash a password string using SHA-256
   * Returns lowercase hex string
   */
  async hash(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  /**
   * Compare a plaintext password to a stored hash
   */
  async verify(password, hash) {
    const h = await this.hash(password);
    return h === hash;
  },
};
