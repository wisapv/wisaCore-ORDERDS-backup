import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout.jsx';
import Overview from './pages/Overview.jsx';
import CapacityPage from './pages/Capacity/CapacityPage.jsx';
import Minmax3MonthTabs from './pages/Minmax3Month/Minmax3MonthTabs.jsx';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Overview />} />
          <Route path="capacity" element={<CapacityPage />} />
          <Route path="minmax3month" element={<Minmax3MonthTabs />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}