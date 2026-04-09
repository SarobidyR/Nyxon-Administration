const service = require('./service');

const getAll      = async (req, res) => {
  const result = await service.getAll(req.query);
  res.json({ success: true, ...result });
};
const getOne      = async (req, res) => {
  const data = await service.getOne(req.params.id);
  res.json({ success: true, data });
};
const create      = async (req, res) => {
  const data = await service.create(req.body, req.user.id);
  res.status(201).json({ success: true, message: 'Produit créé', data });
};
const update      = async (req, res) => {
  const data = await service.update(req.params.id, req.body);
  res.json({ success: true, message: 'Produit mis à jour', data });
};
const updateStatut = async (req, res) => {
  const data = await service.updateStatut(req.params.id, req.body.statut);
  res.json({ success: true, message: 'Statut mis à jour', data });
};
const remove      = async (req, res) => {
  await service.remove(req.params.id);
  res.json({ success: true, message: 'Produit supprimé' });
};
const getAlertes  = async (req, res) => {
  const data = await service.getAlertes();
  res.json({ success: true, data });
};

module.exports = { getAll, getOne, create, update, updateStatut, remove, getAlertes };