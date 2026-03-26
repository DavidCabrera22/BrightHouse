import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import ProjectsPage from './components/ProjectsPage';
import AboutUsPage from './components/AboutUsPage';
import SolutionsPage from './components/SolutionsPage';
import LoginPage from './components/LoginPage';
import CrmDashboard from './components/CrmDashboard';
import LeadsPage from './components/LeadsPage';
import PipelinePage from './components/PipelinePage';
import ConversationsPage from './components/ConversationsPage';
import AutomationsPage from './components/AutomationsPage';
import ProjectDashboardPage from './components/ProjectDashboardPage';
import ProjectUnitsPage from './components/ProjectUnitsPage';
import ProjectDocumentsPage from './components/ProjectDocumentsPage';
import ProjectAnalyticsPage from './components/ProjectAnalyticsPage';
import MarketingPage from './components/MarketingPage';
import AnalyticsPage from './components/AnalyticsPage';
import CommissionsPage from './components/CommissionsPage';
import OasisParkPage from './components/OasisParkPage';
import PublicProjectsPage from './components/PublicProjectsPage';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/proyectos" element={<PublicProjectsPage />} />
        <Route path="/nosotros" element={<AboutUsPage />} />
        <Route path="/soluciones" element={<SolutionsPage />} />
        <Route path="/proyectos/oasis-park" element={<OasisParkPage />} />
        
        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/crm" element={<CrmDashboard />} />
          <Route path="/crm/leads" element={<LeadsPage />} />
          <Route path="/crm/pipeline" element={<PipelinePage />} />
          <Route path="/crm/conversations" element={<ConversationsPage />} />
          <Route path="/crm/automations" element={<AutomationsPage />} />
          <Route path="/crm/projects" element={<ProjectsPage />} />
          <Route path="/crm/projects/:projectId" element={<ProjectDashboardPage />} />
          <Route path="/crm/projects/:projectId/units" element={<ProjectUnitsPage />} />
          <Route path="/crm/projects/:projectId/documents" element={<ProjectDocumentsPage />} />
          <Route path="/crm/projects/:projectId/analytics" element={<ProjectAnalyticsPage />} />
          <Route path="/crm/marketing" element={<MarketingPage />} />
          <Route path="/crm/analytics" element={<AnalyticsPage />} />
          <Route path="/crm/commissions" element={<CommissionsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
