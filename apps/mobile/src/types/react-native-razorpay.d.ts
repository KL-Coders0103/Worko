declare module 'react-native-razorpay' {
  export type RazorpayCheckoutResult = {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  };

  const RazorpayCheckout: {
    open(options: Record<string, unknown>): Promise<RazorpayCheckoutResult>;
    on(event: string, callback: (...args: unknown[]) => void): { remove: () => void };
    removeAllListeners(event?: string): void;
  };

  export default RazorpayCheckout;
}
