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
  const { motif } = req.body;
  const data = await service.remove(req.params.id, req.user.id, motif);
  res.json({ success: true, message: `Produit "${data.nom}" archivé`, data });
};
const restore     = async (req, res) => {
  const data = await service.restore(req.params.id);
  res.json({ success: true, message: `Produit "${data.nom}" restauré`, data });
};
const getArchives = async (req, res) => {
  res.json({ success: true, ...(await service.getArchives(req.query)) });
};
const getAlertes  = async (req, res) => {
  const data = await service.getAlertes();
  res.json({ success: true, data });
};

const hardDelete = async (req, res) => {
  const data = await service.hardDelete(req.params.id);
  res.json({ success: true, message: `Produit "${data.nom}" supprimé définitivement` });
};
module.exports = { getAll, getOne, create, update, updateStatut, remove, restore, getArchives, getAlertes, hardDelete };
