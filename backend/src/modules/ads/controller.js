const s = require('./service');

const getAll       = async (req, res) => res.json({ success:true, ...(await s.getAll(req.query)) });
const getOne       = async (req, res) => res.json({ success:true, data: await s.getOne(req.params.id) });
const create       = async (req, res) => res.status(201).json({ success:true, message:'Campagne créée',       data: await s.create(req.body, req.user.id) });
const update       = async (req, res) => res.json({ success:true, message:'Campagne mise à jour',             data: await s.update(req.params.id, req.body) });
const updateStatut = async (req, res) => res.json({ success:true, message:'Statut mis à jour',                data: await s.updateStatut(req.params.id, req.body.statut) });
const ajouterDepense = async (req, res) => res.status(201).json({ success:true, message:'Dépense enregistrée', data: await s.ajouterDepense(req.params.id, req.body) });
const getDepenses  = async (req, res) => res.json({ success:true, ...(await s.getDepenses(req.params.id, req.query)) });
const remove       = async (req, res) => { await s.remove(req.params.id); res.json({ success:true, message:'Campagne supprimée' }); };
const getResume    = async (req, res) => res.json({ success:true, data: await s.getResume() });

module.exports = { getAll, getOne, create, update, updateStatut, ajouterDepense, getDepenses, remove, getResume };