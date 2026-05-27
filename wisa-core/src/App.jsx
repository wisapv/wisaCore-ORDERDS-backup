import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Overview from './pages/Overview';
import CapacityPage from './pages/Capacity/CapacityPage';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Overview />} />
          <Route path="capacity" element={<CapacityPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}