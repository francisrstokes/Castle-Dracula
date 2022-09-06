declare global {
  interface Window {
    bridge: {
      setSize: (width: number, height: number) => void;
    }
  }
}

export const getBridge = () => window.bridge;
