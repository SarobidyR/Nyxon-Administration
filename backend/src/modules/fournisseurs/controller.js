const s = require('./service');
const getAll = async (req, res) => res.json({ success: true, ...(await s.getAll(req.query)) });
const getOne = async (req, res) => res.json({ success: true, data: await s.getOne(req.params.id) });
const create = async (req, res) => res.status(201).json({ success: true, message: 'Fournisseur créé', data: await s.create(req.body) });
const update = async (req, res) => res.json({ success: true, message: 'Fournisseur mis à jour', data: await s.update(req.params.id, req.body) });
const remove = async (req, res) => { await s.remove(req.params.id); res.json({ success: true, message: 'Fournisseur archivé' }); };
module.exports = { getAll, getOne, create, update, remove };