const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path} →`, err.message);

  // Erreurs de validation express-validator
  if (err.type === 'validation') {
    return res.status(422).json({ success: false, message: 'Données invalides', errors: err.errors });
  }

  // Erreurs PostgreSQL
  if (err.code) {
    switch (err.code) {
      case '23505': // unique violation
        return res.status(409).json({ success: false, message: 'Cette valeur existe déjà', detail: err.detail });
      case '23503': // foreign key violation
        return res.status(409).json({ success: false, message: 'Référence invalide', detail: err.detail });
      case '22P02': // invalid uuid
        return res.status(400).json({ success: false, message: 'Identifiant invalide' });
    }
  }

  // Erreurs JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Token invalide' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expiré' });
  }

  // Erreur personnalisée avec statusCode
  const status  = err.statusCode || err.status || 500;
  const message = err.message   || 'Erreur serveur interne';
  res.status(status).json({ success: false, message });
};

module.exports = errorHandler;