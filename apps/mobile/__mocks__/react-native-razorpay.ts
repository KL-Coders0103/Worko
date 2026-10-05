const RazorpayCheckout = {
  open: jest.fn(() =>
    Promise.resolve({
      razorpay_payment_id: 'test_payment_id',
      razorpay_order_id: 'test_order_id',
      razorpay_signature: 'test_signature',
    }),
  ),
};

export default RazorpayCheckout;
