import { useEffect } from 'react';
import useUiStore from '../../store/uiStore';

export default function FournisseursForm() {
  const setPageTitle = useUiStore((s) => s.setPageTitle);
  useEffect(() => { setPageTitle('Nouveau fournisseur'); }, [setPageTitle]);

  return (
    <div>
      <div className="page-header"><h2 className="page-title">Nouveau fournisseur</h2></div>
      <div className="card p-8 text-center text-gray-400">Nouveau fournisseur — à implémenter</div>
    </div>
  );
}