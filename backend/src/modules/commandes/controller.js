const service = require('./service');

const getAll = async (req, res) => {
  res.json({ success: true, ...(await service.getAll(req.query)) });
};

const getOne = async (req, res) => {
  res.json({ success: true, data: await service.getOne(req.params.id) });
};

const create = async (req, res) => {
  const data = await service.create(req.body, req.user.id);
  res.status(201).json({ success: true, message: 'Commande créée', data });
};

const update = async (req, res) => {
  const data = await service.update(req.params.id, req.body, req.user.id);
  res.json({ success: true, message: 'Commande mise à jour', data });
};

const updateStatut = async (req, res) => {
  const { statut, commentaire } = req.body;
  const data = await service.updateStatut(req.params.id, statut, commentaire, req.user.id);
  res.json({ success: true, message: `Statut mis à jour : ${data.statut}`, data });
};

const enregistrerPaiement = async (req, res) => {
  const { montant, mode } = req.body;
  const data = await service.enregistrerPaiement(req.params.id, montant, mode);
  res.json({ success: true, message: 'Paiement enregistré', data });
};

const annuler = async (req, res) => {
  const data = await service.annuler(req.params.id, req.user.id);
  res.json({ success: true, message: 'Commande annulée', data });
};

const getStats = async (req, res) => {
  res.json({ success: true, data: await service.getStats() });
};

module.exports = { getAll, getOne, create, update, updateStatut, enregistrerPaiement, annuler, getStats };