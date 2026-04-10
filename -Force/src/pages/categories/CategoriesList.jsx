import { useEffect } from 'react';
import useUiStore from '../../store/uiStore';

export default function CategoriesList() {
  const setPageTitle = useUiStore((s) => s.setPageTitle);
  useEffect(() => { setPageTitle('Catégories'); }, [setPageTitle]);

  return (
    <div>
      <div className="page-header"><h2 className="page-title">Catégories</h2></div>
      <div className="card p-8 text-center text-gray-400">Catégories — à implémenter</div>
    </div>
  );
}