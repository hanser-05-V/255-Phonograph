import {randomBytes, scrypt, timingSafeEqual} from 'node:crypto';

const SCRYPT_COST = 16_384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const SALT_BYTES = 16;
const HASH_BYTES = 64;
const SCRYPT_MAX_MEMORY = 64 * 1024 * 1024;

function derivePassword(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      HASH_BYTES,
      {
        N: SCRYPT_COST,
        r: SCRYPT_BLOCK_SIZE,
        p: SCRYPT_PARALLELIZATION,
        maxmem: SCRYPT_MAX_MEMORY,
      },
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(derivedKey);
      },
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const derived = await derivePassword(password, salt);

  return [
    'scrypt',
    SCRYPT_COST,
    SCRYPT_BLOCK_SIZE,
    SCRYPT_PARALLELIZATION,
    salt.toString('base64url'),
    derived.toString('base64url'),
  ].join('$');
}

export async function verifyPassword(
  password: string,
  encoded: string,
): Promise<boolean> {
  try {
    const parts = encoded.split('$');
    if (parts.length !== 6) {
      return false;
    }
    const [algorithm, cost, blockSize, parallelization, saltText, hashText] = parts;
    if (
      algorithm !== 'scrypt' ||
      cost !== String(SCRYPT_COST) ||
      blockSize !== String(SCRYPT_BLOCK_SIZE) ||
      parallelization !== String(SCRYPT_PARALLELIZATION) ||
      !saltText ||
      !hashText ||
      !/^[A-Za-z0-9_-]+$/.test(saltText) ||
      !/^[A-Za-z0-9_-]+$/.test(hashText)
    ) {
      return false;
    }

    const salt = Buffer.from(saltText, 'base64url');
    const expected = Buffer.from(hashText, 'base64url');
    if (salt.length !== SALT_BYTES || expected.length !== HASH_BYTES) {
      return false;
    }

    const actual = await derivePassword(password, salt);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
