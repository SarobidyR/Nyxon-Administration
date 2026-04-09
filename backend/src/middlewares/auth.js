const jwt    = require('jsonwebtoken');
const { query } = require('../config/db');

// ── Hiérarchie des rôles ─────────────────────────────────────
const ROLE_HIERARCHY = {
  superadmin: 5,
  admin:      4,
  manager:    3,
  vendeur:    2,
  lecteur:    1,
};

// ── Vérifier le token JWT ────────────────────────────────────
const authenticate = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Token manquant' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Vérifier que l'utilisateur existe et est actif
    const { rows } = await query(
      'SELECT id, nom, prenom, email, role, statut FROM users WHERE id = $1',
      [decoded.userId]
    );
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ success: false, message: 'Utilisateur introuvable' });
    }
    if (user.statut !== 'actif') {
      return res.status(403).json({ success: false, message: 'Compte suspendu ou inactif' });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

// ── Vérifier le rôle minimum requis ─────────────────────────
// Usage : authorize('admin')  ou  authorize(['admin','manager'])
const authorize = (requiredRoles) => {
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }

    const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
    const hasAccess = roles.some(role => {
      // Accès exact au rôle OU rôle supérieur dans la hiérarchie
      return userLevel >= (ROLE_HIERARCHY[role] || 0);
    });

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: `Accès refusé. Rôle requis : ${roles.join(' ou ')}`,
      });
    }
    next();
  };
};

// ── Vérifier le refresh token ────────────────────────────────
const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};

// ── Générer les tokens ───────────────────────────────────────
const generateTokens = (user) => {
  const payload = { userId: user.id, role: user.role };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });

  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });

  return { accessToken, refreshToken };
};

module.exports = { authenticate, authorize, generateTokens, verifyRefreshToken };