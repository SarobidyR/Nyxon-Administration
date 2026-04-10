const service = require('./service');

const getMouvements = async (req, res) => {
  res.json({ success: true, ...(await service.getMouvements(req.query)) });
};

const getMouvementsProduit = async (req, res) => {
  res.json({ success: true, ...(await service.getMouvementsProduit(req.params.produitId, req.query)) });
};

const getValeurStock = async (req, res) => {
  res.json({ success: true, data: await service.getValeurStock() });
};

const entree = async (req, res) => {
  const data = await service.entree(req.body, req.user.id);
  res.status(201).json({ success: true, message: 'Entrée stock enregistrée', data });
};

const sortie = async (req, res) => {
  const data = await service.sortie(req.body, req.user.id);
  res.status(201).json({ success: true, message: 'Sortie stock enregistrée', data });
};

const ajustement = async (req, res) => {
  const data = await service.ajustement(req.body, req.user.id);
  res.json({ success: true, message: 'Ajustement effectué', data });
};

const creerInventaire = async (req, res) => {
  const data = await service.creerInventaire(req.body, req.user.id);
  res.status(201).json({ success: true, message: 'Inventaire créé', data });
};

const validerInventaire = async (req, res) => {
  const data = await service.validerInventaire(req.params.id, req.user.id);
  res.json({ success: true, message: 'Inventaire validé — ajustements appliqués', data });
};

const getInventaires = async (req, res) => {
  res.json({ success: true, ...(await service.getInventaires(req.query)) });
};

module.exports = {
  getMouvements, getMouvementsProduit, getValeurStock,
  entree, sortie, ajustement,
  creerInventaire, validerInventaire, getInventaires,
};