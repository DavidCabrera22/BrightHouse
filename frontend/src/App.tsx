import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import ProjectsPage from './components/ProjectsPage';
import AboutUsPage from './components/AboutUsPage';
import SolutionsPage from './components/SolutionsPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/proyectos" element={<ProjectsPage />} />
        <Route path="/nosotros" element={<AboutUsPage />} />
        <Route path="/soluciones" element={<SolutionsPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
