import { useEffect } from 'react';
import useUiStore from '../../store/uiStore';

export default function ProduitsList() {
  const setPageTitle = useUiStore((s) => s.setPageTitle);
  useEffect(() => { setPageTitle('Produits'); }, [setPageTitle]);

  return (
    <div>
      <div className="page-header"><h2 className="page-title">Produits</h2></div>
      <div className="card p-8 text-center text-gray-400">Produits — à implémenter</div>
    </div>
  );
}