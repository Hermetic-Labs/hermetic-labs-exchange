import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Header } from './components/Header';
import { HomePage } from './pages/HomePage';
import { ProductPage } from './pages/ProductPage';
import { AuthorPage } from './pages/AuthorPage';

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <div className="min-h-screen bg-cyber-bg">
        <Header />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/product/:slug" element={<ProductPage />} />
          <Route path="/author/:id" element={<AuthorPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
