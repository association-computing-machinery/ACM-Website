import { Router } from 'express';
import { email, password, text, HttpError } from '../validation.js';
import { createSession, sessionToken, clearSession, hash, requireSession, rateLimit } from '../security.js';

export function authRoutes({ database, auth, env }) {
  const router = Router();
  const limit = (category, count) => rateLimit(database, env, category, count);
  const identity = body => {
    const token = text(body.token, 'Code', 10, 6);
    if (!/^\d{6,10}$/.test(token)) throw new HttpError(400, 'Enter the numeric code from your email.');
    return { email: email(body.email), token };
  };
  router.post('/signup', limit('email', 5), async (req, res) => {
    if (req.body.termsAccepted !== true) throw new HttpError(400, 'Accept the terms and privacy policy to continue.');
    await auth.signup({ email: email(req.body.email), password: password(req.body.password),
      fullName: text(req.body.fullName, 'Full name', 160, 1), university: text(req.body.university ?? '', 'University', 200),
      phone: text(req.body.phone ?? '', 'Phone', 40), termsAccepted: true });
    // Deliberately identical whether or not the address was already registered.
    res.status(202).json({ message: 'If that address can be registered, a verification code is on its way.' });
  });
  router.post('/verify', limit('verify', 10), async (req, res) => {
    const user = await auth.verify({ email: email(req.body.email), token: text(req.body.token, 'Code', 10, 6) });
    const db = typeof database === 'function' ? database() : database;
    res.json({ user: await createSession(db, user, req, res, env) });
  });
  router.post('/resend', limit('email', 5), async (req, res) => {
    await auth.resend(email(req.body.email));
    res.status(202).json({ message: 'If this address is awaiting verification, a new code has been sent.' });
  });
  router.post('/login', limit('login', 15), async (req, res) => {
    const input = { email: email(req.body.email), password: text(req.body.password, 'Password', 128, 1) };
    input.password = req.body.password;
    const user = await auth.login(input);
    const db = typeof database === 'function' ? database() : database;
    res.json({ user: await createSession(db, user, req, res, env) });
  });
  router.post('/forgot-password', limit('email', 5), async (req, res) => {
    await auth.recover(email(req.body.email));
    res.status(202).json({ message: 'If an account exists, a recovery code will arrive shortly.' });
  });
  router.post('/verify-reset-token', limit('verify', 10), async (req, res) => {
    await auth.verifyResetToken({ email: email(req.body.email), token: text(req.body.token, 'Code', 10, 6) });
    res.json({ valid: true });
  });
  router.post('/reset-password', limit('verify', 10), async (req, res) => {
    const user = await auth.reset({ ...identity(req.body), password: password(req.body.password) });
    const db = typeof database === 'function' ? database() : database;
    await db.query('DELETE FROM user_auth_sessions WHERE user_id = ?', [user.id]);
    clearSession(res, env);
    res.json({ message: 'Password updated. Please sign in again.' });
  });
  router.get('/session', (req, res, next) => {
    if (!sessionToken(req, env)) return res.json({ user: null });
    next();
  }, requireSession(database, env), (req, res) => res.json({ user: req.user }));
  router.post('/logout', async (req, res) => {
    const token = sessionToken(req, env);
    const db = typeof database === 'function' ? database() : database;
    if (token) await db.query('DELETE FROM user_auth_sessions WHERE token_hash = ?', [hash(token)]);
    clearSession(res, env);
    res.json({ message: 'Signed out.' });
  });
  return router;
}
