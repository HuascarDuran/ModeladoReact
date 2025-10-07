import { Routes, Route, NavLink } from "react-router-dom";
import Layout from "./components/Layout";
import LCG from "./pages/LCG";
import MCG from "./pages/MCG";
import MiddleSquare from "./pages/MiddleSquare";
import ProductMethod from "./pages/ProductMethod";
import InventorySugar from "./pages/InventorySugar";
import ShopArrivals from "./pages/ShopArrivals";
import DepositoVariable from "./pages/DepositoVariable";
import Dados from "./pages/Dados";
import Home from "./pages/Home"; // ✅ Nuevo Home importado

export default function App() {
  return (
    <Layout
      nav={
        <>
          <NavLink to="/" end>Inicio</NavLink>
          <NavLink to="/lcg">Lineal</NavLink>
          <NavLink to="/mcg">Multiplicativo</NavLink>
          <NavLink to="/middle-square">Granja</NavLink>
          <NavLink to="/product">Inventario de Azúcar</NavLink>
          <NavLink to="/inventory-sugar">Depósito Plazo Fijo</NavLink>
          <NavLink to="/shop-arrivals">Tienda</NavLink>
          <NavLink to="/deposito-variable">Depósito Variable</NavLink>
          <NavLink to="/dados">Dados</NavLink>
        </>
      }
    >
      <Routes>
        {/* ✅ Reemplazamos el bloque anterior por el nuevo Home */}
        <Route index element={<Home />} />

        <Route path="/lcg" element={<LCG />} />
        <Route path="/mcg" element={<MCG />} />
        <Route path="/middle-square" element={<MiddleSquare />} />
        <Route path="/product" element={<ProductMethod />} />
        <Route path="/inventory-sugar" element={<InventorySugar />} />
        <Route path="/shop-arrivals" element={<ShopArrivals />} />
        <Route path="/deposito-variable" element={<DepositoVariable />} />
        <Route path="/dados" element={<Dados />} />
      </Routes>
    </Layout>
  );
}