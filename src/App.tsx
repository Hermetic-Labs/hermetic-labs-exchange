import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Header } from './components/Header';
import { HomePage } from './pages/HomePage';
import { ProductPage } from './pages/ProductPage';
import { AuthorPage } from './pages/AuthorPage';
import { SuccessPage } from './pages/SuccessPage';
import { AuthPage } from './pages/AuthPage';
import { LibraryPage } from './pages/LibraryPage';
import { SellerDashboardPage } from './pages/SellerDashboardPage';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <div className="min-h-screen bg-cyber-bg">
          <Header />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/product/:slug" element={<ProductPage />} />
            <Route path="/author/:id" element={<AuthorPage />} />
            <Route path="/success" element={<SuccessPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/seller" element={<SellerDashboardPage />} />
          </Routes>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
