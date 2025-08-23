import { useCallback } from 'react';

interface ToastOptions {
  duration?: number;
  position?: 'top' | 'bottom' | 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export const useToast = () => {
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning', options?: ToastOptions) => {
    // For now, we'll use console.log as a placeholder
    // In production, you'd integrate with a toast library like react-toastify
    const style = {
      success: 'color: green; font-weight: bold;',
      error: 'color: red; font-weight: bold;',
      info: 'color: blue; font-weight: bold;',
      warning: 'color: orange; font-weight: bold;',
    };
    
    console.log(`%c[${type.toUpperCase()}] ${message}`, style[type]);
    
    // TODO: Integrate with actual toast library
    // Example with react-toastify:
    // toast[type](message, {
    //   duration: options?.duration || 3000,
    //   position: options?.position || 'top-right',
    // });
  }, []);

  return {
    toast: {
      success: (message: string, options?: ToastOptions) => showToast(message, 'success', options),
      error: (message: string, options?: ToastOptions) => showToast(message, 'error', options),
      info: (message: string, options?: ToastOptions) => showToast(message, 'info', options),
      warning: (message: string, options?: ToastOptions) => showToast(message, 'warning', options),
    },
  };
};