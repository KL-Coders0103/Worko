/**
 * @format
 */

import React from 'react';

jest.mock('react-native-razorpay');
import ReactTestRenderer, { act } from 'react-test-renderer';
import App from '../App';

test(
  'renders correctly and cleans up splash timer',
  async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<App />);
      // Flush any immediately-resolved effects while the test renderer is active.
      await Promise.resolve();
      await Promise.resolve();
    });
    // Unmount inside act so App's splash timeout is cleared before Jest tears down.
    await act(async () => {
      renderer!.unmount();
    });
  },
  15000,
);
