const s = require('./service');
const getAll = async (req, res) => res.json({ success: true, ...(await s.getAll(req.query)) });
const getOne = async (req, res) => res.json({ success: true, data: await s.getOne(req.params.id) });
const create = async (req, res) => res.status(201).json({ success: true, message: 'Client créé', data: await s.create(req.body, req.user.id) });
const update = async (req, res) => res.json({ success: true, message: 'Client mis à jour', data: await s.update(req.params.id, req.body) });
const remove = async (req, res) => { await s.remove(req.params.id); res.json({ success: true, message: 'Client archivé' }); };
const getTop = async (req, res) => res.json({ success: true, data: await s.getTop(req.query.limit) });
module.exports = { getAll, getOne, create, update, remove, getTop };