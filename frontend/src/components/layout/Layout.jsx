import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import useUiStore from '../../store/uiStore';

export default function Layout() {
  const sidebarOpen     = useUiStore((s) => s.sidebarOpen);
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const closeSidebar    = useUiStore((s) => s.closeSidebar);

  // Fermer la sidebar sur mobile quand on change de route
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) return;
      closeSidebar();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [closeSidebar]);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <Sidebar />

      {/* Contenu principal */}
      <div
        className={`
          flex flex-col flex-1 min-w-0 overflow-hidden
          transition-all duration-300
          ${sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-[240px]'}
        `}
      >
        <Topbar />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-screen-xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
