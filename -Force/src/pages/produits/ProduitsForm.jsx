import { useEffect } from 'react';
import useUiStore from '../../store/uiStore';

export default function ProduitsForm() {
  const setPageTitle = useUiStore((s) => s.setPageTitle);
  useEffect(() => { setPageTitle('Nouveau produit'); }, [setPageTitle]);

  return (
    <div>
      <div className="page-header"><h2 className="page-title">Nouveau produit</h2></div>
      <div className="card p-8 text-center text-gray-400">Nouveau produit — à implémenter</div>
    </div>
  );
}