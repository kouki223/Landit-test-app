import { render, screen, fireEvent } from '@testing-library/react';
import RadiusControl from './RadiusControl';

function setup(overrides = {}) {
  const props = {
    radiusKm: 5,
    onRadiusChange: jest.fn(),
    onSearch: jest.fn(),
    onClear: jest.fn(),
    active: false,
    disabled: false,
    ...overrides,
  };
  render(<RadiusControl {...props} />);
  return props;
}

describe('RadiusControl', () => {
  it('shows the current radius value', () => {
    setup({ radiusKm: 8 });
    expect(screen.getByText('8km')).toBeInTheDocument();
  });

  it('emits onRadiusChange from the slider', () => {
    const { onRadiusChange } = setup();
    fireEvent.change(screen.getByLabelText('検索半径(km)'), {
      target: { value: '12' },
    });
    expect(onRadiusChange).toHaveBeenCalledWith(12);
  });

  it('emits onRadiusChange from a preset button', () => {
    const { onRadiusChange } = setup();
    fireEvent.click(screen.getByRole('button', { name: '3km' }));
    expect(onRadiusChange).toHaveBeenCalledWith(3);
  });

  it('runs a search on button click', () => {
    const { onSearch } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'この範囲で検索' }));
    expect(onSearch).toHaveBeenCalled();
  });

  it('disables search when disabled', () => {
    setup({ disabled: true });
    expect(screen.getByRole('button', { name: 'この範囲で検索' })).toBeDisabled();
  });

  it('hides clear until active, then calls onClear', () => {
    const { onClear, ...rest } = setup({ active: false });
    expect(screen.queryByRole('button', { name: 'クリア' })).toBeNull();

    render(
      <RadiusControl
        radiusKm={5}
        onRadiusChange={jest.fn()}
        onSearch={jest.fn()}
        onClear={onClear}
        active
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'クリア' }));
    expect(onClear).toHaveBeenCalled();
    void rest;
  });
});
