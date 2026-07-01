import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Overview from './pages/Overview';
import CapacityPage from './pages/Capacity/CapacityPage';
import Minmax3MonthPage from './pages/Minmax3Month/Minmax3MonthPage';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Overview />} />
          <Route path="capacity" element={<CapacityPage />} />
          <Route path="minmax3month" element={<Minmax3MonthPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}