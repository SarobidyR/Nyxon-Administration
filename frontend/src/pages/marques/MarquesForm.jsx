import { useEffect } from 'react';
import useUiStore from '../../store/uiStore';

export default function MarquesForm() {
  const setPageTitle = useUiStore((s) => s.setPageTitle);
  useEffect(() => { setPageTitle('Nouvelle marque'); }, [setPageTitle]);

  return (
    <div>
      <div className="page-header"><h2 className="page-title">Nouvelle marque</h2></div>
      <div className="card p-8 text-center text-gray-400">Nouvelle marque — à implémenter</div>
    </div>
  );
}