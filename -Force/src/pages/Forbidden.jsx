import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export default function Forbidden() {
  const navigate = useNavigate();
  const user     = useAuthStore((s) => s.user);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-8xl font-bold text-amber-500">403</p>
        <h1 className="mt-4 text-2xl font-semibold text-gray-900">Accès refusé</h1>
        <p className="mt-2 text-gray-500">
          Votre rôle <span className="font-medium text-gray-700">({user?.role})</span> ne
          vous permet pas d'accéder à cette page.
        </p>
        <p className="mt-1 text-sm text-gray-400">
          Contactez un administrateur si vous pensez que c'est une erreur.
        </p>
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
