import { debounce, distanceMeters } from '@/lib/geo';

describe('debounce', () => {
  jest.useFakeTimers();

  it('invokes only once after the wait, with the latest args', () => {
    const fn = jest.fn();
    const d = debounce(fn, 500);
    d(1);
    d(2);
    d(3);
    expect(fn).not.toHaveBeenCalled();
    jest.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(3);
  });

  it('cancel() prevents a pending call', () => {
    const fn = jest.fn();
    const d = debounce(fn, 500);
    d('x');
    d.cancel();
    jest.advanceTimersByTime(500);
    expect(fn).not.toHaveBeenCalled();
  });
});

describe('distanceMeters', () => {
  it('is ~0 for identical points', () => {
    expect(distanceMeters({ lat: 35.68, lng: 139.76 }, { lat: 35.68, lng: 139.76 })).toBeCloseTo(0, 5);
  });

  it('approximates a known distance (Tokyo Tower -> Tokyo Station ~3.2km)', () => {
    const d = distanceMeters(
      { lat: 35.658581, lng: 139.745433 },
      { lat: 35.681236, lng: 139.767125 },
    );
    // allow generous tolerance; just verify the order of magnitude is correct
    expect(d).toBeGreaterThan(2800);
    expect(d).toBeLessThan(3600);
  });
});
