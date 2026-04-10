import { useEffect } from 'react';
import useUiStore from '../store/uiStore';

export default function Dashboard() {
  const setPageTitle = useUiStore((s) => s.setPageTitle);
  useEffect(() => { setPageTitle('Dashboard'); }, [setPageTitle]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Tableau de bord</h2>
          <p className="page-subtitle">Bienvenue sur Nyxon</p>
        </div>
      </div>
      <div className="card p-8 text-center text-gray-400">
        Dashboard — à compléter en Phase 4
      </div>
    </div>
  );
}
