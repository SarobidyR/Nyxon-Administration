const bcrypt = require('bcryptjs');
const { query, withTransaction } = require('../../config/db');
const { generateTokens, verifyRefreshToken } = require('../../middlewares/auth');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;

// ── Register ─────────────────────────────────────────────────
const register = async ({ nom, prenom, email, password, role = 'vendeur' }) => {
  const exists = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (exists.rows.length > 0) {
    const err = new Error('Cet email est déjà utilisé'); err.statusCode = 409; throw err;
  }

  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const { rows } = await query(
    `INSERT INTO users (nom, prenom, email, password_hash, role)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING id, nom, prenom, email, role, statut, created_at`,
    [nom, prenom, email, hash, role]
  );
  return rows[0];
};

// ── Login ─────────────────────────────────────────────────────
const login = async ({ email, password }) => {
  const { rows } = await query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  const user = rows[0];

  if (!user) {
    const err = new Error('Email ou mot de passe incorrect'); err.statusCode = 401; throw err;
  }
  if (user.statut !== 'actif') {
    const err = new Error('Compte suspendu ou inactif'); err.statusCode = 403; throw err;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    const err = new Error('Email ou mot de passe incorrect'); err.statusCode = 401; throw err;
  }

  const tokens = generateTokens(user);

  // Sauvegarder le refresh token en base
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1,$2,$3)',
    [user.id, tokens.refreshToken, expiresAt]
  );

  // Mettre à jour derniere_connexion
  await query('UPDATE users SET derniere_connexion = NOW() WHERE id = $1', [user.id]);

  const { password_hash, ...safeUser } = user;
  return { user: safeUser, ...tokens };
};

// ── Refresh ───────────────────────────────────────────────────
const refresh = async (refreshToken) => {
  if (!refreshToken) {
    const err = new Error('Refresh token manquant'); err.statusCode = 401; throw err;
  }

  // Vérifier en base
  const { rows } = await query(
    'SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()',
    [refreshToken]
  );
  if (rows.length === 0) {
    const err = new Error('Refresh token invalide ou expiré'); err.statusCode = 401; throw err;
  }

  const decoded = verifyRefreshToken(refreshToken);

  // Récupérer l'utilisateur
  const userResult = await query(
    'SELECT id, nom, prenom, email, role, statut FROM users WHERE id = $1',
    [decoded.userId]
  );
  const user = userResult.rows[0];
  if (!user || user.statut !== 'actif') {
    const err = new Error('Utilisateur invalide'); err.statusCode = 401; throw err;
  }

  // Rotation : supprimer l'ancien, créer un nouveau
  await query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
  const tokens = generateTokens(user);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1,$2,$3)',
    [user.id, tokens.refreshToken, expiresAt]
  );

  return tokens;
};

// ── Logout ────────────────────────────────────────────────────
const logout = async (userId, refreshToken) => {
  if (refreshToken) {
    await query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
  } else {
    // Supprimer tous les tokens de cet utilisateur
    await query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
  }
};

// ── Change password ───────────────────────────────────────────
const changePassword = async (userId, ancienPassword, nouveauPassword) => {
  const { rows } = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
  const valid = await bcrypt.compare(ancienPassword, rows[0].password_hash);
  if (!valid) {
    const err = new Error('Ancien mot de passe incorrect'); err.statusCode = 400; throw err;
  }
  const hash = await bcrypt.hash(nouveauPassword, BCRYPT_ROUNDS);
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, userId]);
  // Invalider tous les refresh tokens
  await query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
};

module.exports = { register, login, refresh, logout, changePassword };