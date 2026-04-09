const s = require('./service');

const getAll = async (req, res) => {
  res.json({ success: true, ...(await s.getAll(req.query)) });
};

const getOne = async (req, res) => {
  res.json({ success: true, data: await s.getOne(req.params.id) });
};

const create = async (req, res) => {
  const data = await s.create(req.body);
  res.status(201).json({ success: true, message: 'Marque créée', data });
};

const update = async (req, res) => {
  const data = await s.update(req.params.id, req.body);
  res.json({ success: true, message: 'Marque mise à jour', data });
};

const toggleActif = async (req, res) => {
  const data = await s.toggleActif(req.params.id, req.body.actif);
  res.json({ success: true, message: `Marque ${data.actif ? 'activée' : 'désactivée'}`, data });
};

const remove = async (req, res) => {
  const result = await s.remove(req.params.id);
  const message = result.soft
    ? 'Marque désactivée (produits liés existants)'
    : 'Marque supprimée définitivement';
  res.json({ success: true, message });
};

module.exports = { getAll, getOne, create, update, toggleActif, remove };