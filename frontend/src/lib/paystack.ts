export const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_1234567890abcdef';

export const initializeSubscriptionPayment = async (email: string, amount: number, planType: string) => {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/paystack/initialize-subscription`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('ttt:token')}`,
    },
    body: JSON.stringify({ email, amount, planType }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to initialize payment');
  }
  
  return response.json();
};

export const verifySubscriptionPayment = async (reference: string, planType: string) => {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/paystack/verify-subscription`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('ttt:token')}`,
    },
    body: JSON.stringify({ reference, planType }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to verify payment');
  }
  
  return response.json();
};

export const loadPaystackScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.Paystack) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Paystack script'));
    document.body.appendChild(script);
  });
};

declare global {
  interface Window {
    Paystack?: any;
  }
}
