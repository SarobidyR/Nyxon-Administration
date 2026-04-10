import { useEffect } from 'react';
import useUiStore from '../../store/uiStore';

export default function ClientDetail() {
  const setPageTitle = useUiStore((s) => s.setPageTitle);
  useEffect(() => { setPageTitle('Fiche client'); }, [setPageTitle]);

  return (
    <div>
      <div className="page-header"><h2 className="page-title">Fiche client</h2></div>
      <div className="card p-8 text-center text-gray-400">Fiche client — à implémenter</div>
    </div>
  );
}