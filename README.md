# PrimeSpace frontend

The PrimeSpace UI is a React application. Its entry point is `src/main.jsx`, and `src/App.jsx` contains the module shell and backend-driven views. The supplied single-file prototype is retained as `prototype-reference.html`; its visual stylesheet and logo are carried into the React app.

## Run from VS Code

1. Open the project root folder (`BMSSSS`) in VS Code.
2. Open a terminal and run `cd frontend`.
3. Run `npm install` once, then run `npm run dev`.
4. Open the local URL printed by Vite (normally `http://localhost:5173`).

The Vite dev server forwards `/api` requests to `http://localhost:8080`. The React app stores the access token in memory and requires backend API responses for sign-in, sign-up, and records; it does not fall back to localStorage. Public sign-up creates a new organisation and its first Property Manager account in PostgreSQL. To join an existing organisation, contact its administrator.
