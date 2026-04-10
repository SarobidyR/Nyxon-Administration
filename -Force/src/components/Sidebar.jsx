import { Link, useLocation } from "react-router-dom";

const Sidebar = () => {
  const location = useLocation();

  const menu = [
    { name: "Dashboard", path: "/" },
    { name: "Produits", path: "/products" },
    { name: "Commandes", path: "/orders" },
  ];

  return (
    <div className="w-64 h-screen bg-black text-white flex flex-col p-5">
      <h1 className="text-xl font-bold mb-10">Nyxon</h1>

      <nav className="space-y-2">
        {menu.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`block p-3 rounded-lg transition ${
              location.pathname === item.path
                ? "bg-white text-black"
                : "hover:bg-gray-800"
            }`}
          >
            {item.name}
          </Link>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;