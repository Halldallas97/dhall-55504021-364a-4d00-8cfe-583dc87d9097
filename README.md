# TurboVets Assessment

This repository is an nx monorepo containing:

- `dashboard` — Angular web application
- `api` — NestJS REST API
- `auth` and `data` — shared libraries
- `task-management.sqlite` — the default local SQLite database

## Prerequisites

Install the following before starting:

- [Node.js](https://nodejs.org/) 22.12 or newer
- npm (included with Node.js)
- Git

Confirm that Node.js and npm are available:

```bash
node --version
npm --version
```

## Run the project locally

### 1. Clone the repository


If you already have the repository open, change to its root directory—the directory containing `package.json`.

### 2. Install dependencies

```bash
npm ci
```


### 3. Configure the API secret

The API needs `JWT_SECRET` to create and validate login tokens. Use a long, random value for local development.

Environment variables set this way apply only to the current terminal session.

### 4. Start the API

In the same terminal where `JWT_SECRET` was set, run:

```bash
npx nx serve api
```

The API starts at `http://localhost:3000/api` and uses `task-management.sqlite` in the repository root by default. Keep this terminal running.

### 5. Start the dashboard

Open a second terminal in the repository root and run:

```bash
npx nx serve dashboard
```

The terminal will print the dashboard URL, normally `http://localhost:4200`. Open it in a browser. Requests beginning with `/api` are proxied to the API on port `3000`.

### 6. Stop the project

Press `Ctrl+C` in both running terminals.


## Tests and quality checks

Run API unit tests:

```bash
npx nx test api
```


