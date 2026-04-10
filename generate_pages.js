const fs = require('fs');
const path = require('path');

const items = [
  "produits/ProduitsList|Produits|ProduitsList",
  "produits/ProduitsForm|Nouveau produit|ProduitsForm",
  "produits/ProduitDetail|Fiche produit|ProduitDetail",
  "clients/ClientsList|Clients|ClientsList",
  "clients/ClientsForm|Nouveau client|ClientsForm",
  "clients/ClientDetail|Fiche client|ClientDetail",
  "fournisseurs/FournisseursList|Fournisseurs|FournisseursList",
  "fournisseurs/FournisseursForm|Nouveau fournisseur|FournisseursForm",
  "marques/MarquesList|Marques|MarquesList",
  "marques/MarquesForm|Nouvelle marque|MarquesForm",
  "categories/CategoriesList|Catégories|CategoriesList"
];

items.forEach(item => {
  const [filepath, title, name] = item.split('|');
  
  // CORRECTION ICI : Ajout de 'frontend' dans le chemin
  const targetDir = path.join(__dirname, 'frontend', 'src', 'pages', path.dirname(filepath));
  const fileName = path.basename(filepath) + '.jsx';
  const fullPath = path.join(targetDir, fileName);

  // Sécurité : crée le dossier récursivement s'il n'existe pas
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const content = `import { useEffect } from 'react';
import useUiStore from '../../store/uiStore';

export default function ${name}() {
  const setPageTitle = useUiStore((s) => s.setPageTitle);
  useEffect(() => { setPageTitle('${title}'); }, [setPageTitle]);

  return (
    <div>
      <div className="page-header"><h2 className="page-title">${title}</h2></div>
      <div className="card p-8 text-center text-gray-400">${title} — à implémenter</div>
    </div>
  );
}`;

  fs.writeFileSync(fullPath, content);
  console.log(`✅ Créé : ${fullPath}`);
});