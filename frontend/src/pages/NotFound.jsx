import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-8xl font-bold text-primary-600">404</p>
        <h1 className="mt-4 text-2xl font-semibold text-gray-900">Page introuvable</h1>
        <p className="mt-2 text-gray-500">Cette page n'existe pas ou a été déplacée.</p>
        <div className="mt-8 flex gap-3 justify-center">
          <button onClick={() => navigate(-1)} className="btn-secondary">
            Retour
          </button>
          <button onClick={() => navigate('/')} className="btn-primary">
            Tableau de bord
          </button>
        </div>
      </div>
    </div>
  );
}
