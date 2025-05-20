# Rolex Automation App

An Electron application for automating Rolex watch purchases.

## Prerequisites

- Node.js 16+ (recommended: latest LTS version)
- npm 8+
- Playwright browsers (will be installed automatically)

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Install Playwright browsers:
   ```bash
   npx playwright install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## Available Scripts

- `npm run dev` - Start the app in development mode with hot-reload
- `npm start` - Build and start the app in production mode
- `npm run build` - Build the app for production
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## Project Structure

```
electron/
├── dist/                   # Compiled TypeScript files
├── src/                    # Source files
│   ├── main/               # Main process code
│   ├── renderer/           # Renderer process code
│   └── preload/            # Preload scripts
├── resources/              # Static assets
├── .eslintrc.json          # ESLint configuration
├── .prettierrc             # Prettier configuration
├── package.json            # Project configuration
├── tsconfig.json           # TypeScript configuration
└── README.md               # This file
```

## Development

### Code Style

- We use [ESLint](https://eslint.org/) for code linting
- We use [Prettier](https://prettier.io/) for code formatting
- We use [TypeScript](https://www.typescriptlang.org/) for type safety

### Git Hooks

This project uses [Husky](https://typicode.github.io/husky/) for Git hooks. The following hooks are set up:

- `pre-commit`: Runs ESLint and Prettier on staged files
- `pre-push`: Runs TypeScript type checking

## Building for Production

To build the app for production, run:

```bash
npm run build
```

The built app will be available in the `release` directory.

## License

MIT
