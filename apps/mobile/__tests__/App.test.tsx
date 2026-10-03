/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import App from '../App';

test(
  'renders correctly',
  async () => {
    await act(async () => {
      ReactTestRenderer.create(<App />);
      // Flush the asynchronous theme preference read and its resulting state update.
      await Promise.resolve();
      await Promise.resolve();
    });
  },
  15000,
);
