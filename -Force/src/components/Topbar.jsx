import { useAuthStore } from "../store/authStore";

const Topbar = () => {
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  return (
    <div className="h-16 bg-white shadow flex items-center justify-between px-6">
      <h2 className="font-semibold">Admin Panel</h2>

      <div className="flex items-center gap-4">
        <span className="text-sm">{user?.email}</span>

        <button
          onClick={logout}
          className="bg-black text-white px-4 py-2 rounded-lg"
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default Topbar;