import { useEffect } from 'react';
import useUiStore from '../../store/uiStore';

export default function ProduitDetail() {
  const setPageTitle = useUiStore((s) => s.setPageTitle);
  useEffect(() => { setPageTitle('Fiche produit'); }, [setPageTitle]);

  return (
    <div>
      <div className="page-header"><h2 className="page-title">Fiche produit</h2></div>
      <div className="card p-8 text-center text-gray-400">Fiche produit — à implémenter</div>
    </div>
  );
}