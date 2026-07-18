import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Bootstrap integration
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import 'bootstrap-icons/font/bootstrap-icons.css';

// Global stylesheet overrides
import './index.css';

import App from './App.jsx';
import { AuthProvider } from './context/AuthContext';

createRoot(document.getElementById('root')).render(
  
      <AuthProvider>
      <App />
    </AuthProvider>,
    
  
);
