import { render, screen } from '@testing-library/react';
import App from './App';

test('renders DinkSync app title', () => {
  render(<App />);
  const titleElement = screen.getByText(/Tournament Management System/i);
  expect(titleElement).toBeInTheDocument();
});
