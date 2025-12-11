import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Dashboard } from './pages/Dashboard';
import { Repositories } from './pages/Repositories';
import { RepositoryDetail } from './pages/RepositoryDetail';
import { Dependencies } from './pages/Dependencies';
import { Notifications } from './pages/Notifications';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { Unauthorized } from './pages/Unauthorized';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';
import { ScanProvider } from './context/ScanContext';
import { SidebarProvider } from './context/SidebarContext';
import { ThemeProvider } from './context/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          
          {/* Protected routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <SocketProvider>
                  <NotificationProvider>
                    <ScanProvider>
                      <SidebarProvider>
                        <Layout>
                          <Routes>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/repositories" element={<Repositories />} />
                            <Route path="/repositories/:id" element={<RepositoryDetail />} />
                            <Route path="/dependencies" element={<Dependencies />} />
                            <Route path="/notifications" element={<Notifications />} />
                            <Route path="/settings" element={<Settings />} />
                          </Routes>
                        </Layout>
                      </SidebarProvider>
                    </ScanProvider>
                  </NotificationProvider>
                </SocketProvider>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
