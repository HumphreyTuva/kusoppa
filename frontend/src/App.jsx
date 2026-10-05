import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./auth";
import Layout from "./components/Layout";
import { Skeleton } from "./components/ui";
import Home from "./pages/Home";
import About from "./pages/About";
import Events from "./pages/Events";
import Briefs from "./pages/Briefs";
import Join from "./pages/Join";
import Contact from "./pages/Contact";
import Register from "./pages/Register";
import Login from "./pages/Login";
import { Forgot, Reset } from "./pages/Password";
import Account from "./pages/Account";
import NotFound from "./pages/NotFound";
import AdminLayout from "./admin/AdminLayout";
import Overview from "./admin/Overview";
import Payments from "./admin/Payments";
import Members from "./admin/Members";
import Settings from "./admin/Settings";
import Users from "./admin/Users";
import Audit from "./admin/Audit";
import Messages from "./admin/Messages";
import { BoardPage, BriefsPage, EventsPage, LinksPage } from "./admin/Content";

function RequireAuth({ children }) {
  const { me, ready } = useAuth();
  const loc = useLocation();
  if (!ready) return <section className="section"><div className="container"><Skeleton /></div></section>;
  if (!me) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="about" element={<About />} />
        <Route path="events" element={<Events />} />
        <Route path="briefs" element={<Briefs />} />
        <Route path="join" element={<Join />} />
        <Route path="contact" element={<Contact />} />
        <Route path="register" element={<Register />} />
        <Route path="login" element={<Login />} />
        <Route path="forgot-password" element={<Forgot />} />
        <Route path="reset-password" element={<Reset />} />
        <Route path="account" element={<RequireAuth><Account /></RequireAuth>} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="admin" element={<AdminLayout />}>
        <Route index element={<Overview />} />
        <Route path="payments" element={<Payments />} />
        <Route path="members" element={<Members />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="briefs" element={<BriefsPage />} />
        <Route path="board" element={<BoardPage />} />
        <Route path="links" element={<LinksPage />} />
        <Route path="messages" element={<Messages />} />
        <Route path="settings" element={<Settings />} />
        <Route path="users" element={<Users />} />
        <Route path="audit" element={<Audit />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  );
}
