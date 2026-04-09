const service = require('./service');

const register = async (req, res) => {
  const user = await service.register(req.body);
  res.status(201).json({ success: true, message: 'Compte créé avec succès', data: user });
};

const login = async (req, res) => {
  const { email, password } = req.body;
  const result = await service.login({ email, password });
  res.json({ success: true, message: 'Connexion réussie', data: result });
};

const refresh = async (req, res) => {
  const token = req.body.refreshToken || req.headers['x-refresh-token'];
  const tokens = await service.refresh(token);
  res.json({ success: true, data: tokens });
};

const logout = async (req, res) => {
  const token = req.body.refreshToken;
  await service.logout(req.user.id, token);
  res.json({ success: true, message: 'Déconnexion réussie' });
};

const me = async (req, res) => {
  res.json({ success: true, data: req.user });
};

const changePassword = async (req, res) => {
  const { ancienPassword, nouveauPassword } = req.body;
  await service.changePassword(req.user.id, ancienPassword, nouveauPassword);
  res.json({ success: true, message: 'Mot de passe modifié. Veuillez vous reconnecter.' });
};

module.exports = { register, login, refresh, logout, me, changePassword };