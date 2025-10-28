import jwt from 'jsonwebtoken';

export function signLink(payload, secret, expiresInMinutes = 10) {
  return jwt.sign(payload, secret, { expiresIn: `${expiresInMinutes}m` });
}

export function verifyToken(token, secret) {
  try {
    return jwt.verify(token, secret);
  } catch {
    return null;
  }
}

export function isOwner(ctx, ownerId) {
  return ctx?.from?.id === Number(ownerId);
}
