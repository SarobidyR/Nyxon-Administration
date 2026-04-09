const s = require('./service');

const getAll = async (req, res) => {
  res.json({ success: true, ...(await s.getAll(req.query)) });
};

const getTree = async (req, res) => {
  const data = await s.getTree();
  res.json({ success: true, data });
};

const getOne = async (req, res) => {
  const data = await s.getOne(req.params.id);
  res.json({ success: true, data });
};

const create = async (req, res) => {
  const data = await s.create(req.body);
  res.status(201).json({ success: true, message: 'Catégorie créée', data });
};

const update = async (req, res) => {
  const data = await s.update(req.params.id, req.body);
  res.json({ success: true, message: 'Catégorie mise à jour', data });
};

const updateOrdre = async (req, res) => {
  const data = await s.updateOrdre(req.params.id, req.body.ordre);
  res.json({ success: true, message: 'Ordre mis à jour', data });
};

const remove = async (req, res) => {
  const result = await s.remove(req.params.id);
  const message = result.soft
    ? 'Catégorie désactivée (produits liés existants)'
    : 'Catégorie supprimée définitivement';
  res.json({ success: true, message });
};

module.exports = { getAll, getTree, getOne, create, update, updateOrdre, remove };