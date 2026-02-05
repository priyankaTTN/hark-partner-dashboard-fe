# Partner Harkaudio Dashboard (FE)

A modern dashboard application built with React, TypeScript, Vite, and shadcn/ui components.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js** (version 18 or higher recommended)
- **npm** (comes with Node.js) or **yarn**

You can check if you have Node.js installed by running:
```bash
node --version
npm --version
```

## Installation

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone <repository-url>
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

   This will install all the required dependencies listed in `package.json`, including:
   - React and React DOM
   - TypeScript
   - Vite
   - Tailwind CSS
   - shadcn/ui components
   - And other project dependencies

## Running the Project

### Development Mode

To start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or another port if 5173 is occupied). The dev server supports hot module replacement (HMR), so changes will be reflected automatically in the browser.

### Build for Production

To create a production build:

```bash
npm run build
```

This will:
- Type-check the TypeScript code
- Build and optimize the application
- Output the production files to the `dist/` directory

### Preview Production Build

To preview the production build locally:

```bash
npm run preview
```

This serves the built application from the `dist/` directory, allowing you to test the production build before deployment.

### Linting

To check for code quality issues:

```bash
npm run lint
```

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the project for production
- `npm run preview` - Preview the production build
- `npm run lint` - Run ESLint to check code quality

## Project Structure

```
my-app/
├── src/
│   ├── components/     # React components
│   │   ├── ui/         # shadcn/ui components
│   │   └── icons/      # Icon components
│   ├── config/         # Configuration files
│   ├── contexts/       # React contexts
│   ├── lib/            # Utility functions
│   ├── App.tsx         # Main application component
│   └── main.tsx        # Application entry point
├── public/             # Static assets
├── dist/               # Production build output
└── package.json        # Project dependencies and scripts
```

## Technologies Used

- **React 19** - UI library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Component library
- **ESLint** - Code linting

## Getting Started

After installation, you can start developing by:

1. Running `npm run dev` to start the development server
2. Opening `http://localhost:5173` in your browser
3. Making changes to files in the `src/` directory
4. Seeing your changes reflected immediately in the browser

## Troubleshooting

If you encounter issues:

1. **Clear node_modules and reinstall**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Check Node.js version**: Ensure you're using Node.js 18 or higher

3. **Port already in use**: If port 5173 is occupied, Vite will automatically use the next available port
