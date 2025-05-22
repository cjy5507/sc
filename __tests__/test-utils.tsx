import { ReactElement } from 'react';
import { RenderOptions, render } from '@testing-library/react';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context';

// Mock the Next.js App Router
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  // Add any other router methods you need
};

// Custom render function that includes the App Router context
export function renderWithProviders(
  ui: ReactElement,
  { route = '/', ...renderOptions }: { route?: string } & Omit<RenderOptions, 'queries'> = {}
) {
  window.history.pushState({}, 'Test page', route);

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <AppRouterContext.Provider
      value={{
        ...mockRouter,
        // Add any other context values you need
      }}
    >
      {children}
    </AppRouterContext.Provider>
  );

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    mockRouter,
  };
}

// Re-export everything from @testing-library/react
export * from '@testing-library/react';

// Override render method
export { renderWithProviders as render };
