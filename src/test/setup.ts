import '@testing-library/jest-dom/vitest';

if (!URL.createObjectURL) {
  URL.createObjectURL = () => 'blob:demo-audio';
}
