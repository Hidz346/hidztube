const axios = require('axios');
const crypto = require('crypto');

let cachedToken = null;
let tokenExpiresAt = 0;

function encryptPassword(pwd) {
  let r = 'xx';
  let n = Math.round(+new Date() / 1000);
  let i = `${pwd}{SPLITTER}${n}`;
  [0, 1].forEach(() => {
    i = `${r}${Buffer.from(i).toString('base64')}`;
  });
  return i;
}

async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && tokenExpiresAt > now + 60000) {
    return cachedToken;
  }

  const encPassword = encryptPassword('hospitality');
  const payload = {
    app_id: 'cubmu',
    tvs_platform_id: 'standalone',
    email_or_phone: 'master_account@transvision.co.id',
    password: encPassword,
    device: {
      device_id: 'web_browser',
      device_brand: 'Web Browser',
      device_type: 'WEB',
      firebase_id: 'NOT_ALLOWED',
      notes: 'Web Browser-V2.1'
    }
  };

  const res = await axios.post(
    'https://servicebuss.transvision.co.id/global/v3/auth/redirect-login',
    payload,
    {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Origin: 'https://www.cubmu.com',
        Referer: 'https://www.cubmu.com/'
      },
      timeout: 10000
    }
  );

  const token = res.data?.data?.access_token;
  if (!token) {
    throw new Error('Gagal mendapatkan access token CubMu');
  }

  cachedToken = token;
  tokenExpiresAt = now + 12 * 60 * 60 * 1000; // cache for 12 hours
  return token;
}

function decryptManifest(str) {
  if (!str) return null;
  try {
    let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const buf = Buffer.from(b64, 'base64');
    if (buf.length < 16) return null;

    const iv = buf.subarray(0, 16);
    const ciphertext = buf.subarray(16);
    const key = Buffer.from('tr4n5V1s10nL1v3y', 'utf-8');

    const decipher = crypto.createDecipheriv('aes-128-cfb', key, iv);
    const dec = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return dec.toString('utf-8');
  } catch (e) {
    return null;
  }
}

module.exports = {
  getAccessToken,
  decryptManifest
};
