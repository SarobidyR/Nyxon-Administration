import { useEffect } from 'react';
import useUiStore from '../../store/uiStore';

export default function ClientsForm() {
  const setPageTitle = useUiStore((s) => s.setPageTitle);
  useEffect(() => { setPageTitle('Nouveau client'); }, [setPageTitle]);

  return (
    <div>
      <div className="page-header"><h2 className="page-title">Nouveau client</h2></div>
      <div className="card p-8 text-center text-gray-400">Nouveau client — à implémenter</div>
    </div>
  );
}