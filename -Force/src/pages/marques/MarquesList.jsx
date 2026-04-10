import { useEffect } from 'react';
import useUiStore from '../../store/uiStore';

export default function MarquesList() {
  const setPageTitle = useUiStore((s) => s.setPageTitle);
  useEffect(() => { setPageTitle('Marques'); }, [setPageTitle]);

  return (
    <div>
      <div className="page-header"><h2 className="page-title">Marques</h2></div>
      <div className="card p-8 text-center text-gray-400">Marques — à implémenter</div>
    </div>
  );
}