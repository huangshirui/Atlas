import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { initializePersistence } from './storage.js';
import './styles.css';
import './persistence.css';

const root = createRoot(document.getElementById('root'));

async function bootstrap() {
  try {
    await initializePersistence();
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  } catch (cause) {
    console.error('Atlas failed to initialize', cause);
    root.render(
      <main className="startup-error">
        <section>
          <span>Online Experience</span>
          <h1>Atlas could not load its online state.</h1>
          <p>{cause instanceof Error ? cause.message : 'Unknown startup error.'}</p>
          <button type="button" onClick={() => window.location.reload()}>Reload</button>
        </section>
      </main>,
    );
  }
}

bootstrap();
