import { render, screen, fireEvent } from '@testing-library/react';
import RadiusControl from '@/components/RadiusControl';

function setup(overrides = {}) {
  const props = {
    enabled: true,
    onToggle: jest.fn(),
    radiusKm: 5,
    onRadiusChange: jest.fn(),
    onSearch: jest.fn(),
    onClear: jest.fn(),
    active: false,
    disabled: false,
    searching: false,
    ...overrides,
  };
  render(<RadiusControl {...props} />);
  return props;
}

describe('RadiusControl', () => {
  it('shows the current radius value when enabled', () => {
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

  it('shows a searching state and disables the button while searching', () => {
    setup({ searching: true });
    expect(screen.getByRole('button', { name: /検索中…/ })).toBeDisabled();
  });

  it('hides clear until active, then calls onClear', () => {
    setup({ active: false });
    expect(screen.queryByRole('button', { name: 'クリア' })).toBeNull();

    const onClear = jest.fn();
    render(
      <RadiusControl
        enabled
        onToggle={jest.fn()}
        radiusKm={5}
        onRadiusChange={jest.fn()}
        onSearch={jest.fn()}
        onClear={onClear}
        active
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'クリア' }));
    expect(onClear).toHaveBeenCalled();
  });

  it('when OFF hides the slider and search, showing only the switch', () => {
    setup({ enabled: false });
    expect(screen.queryByLabelText('検索半径(km)')).toBeNull();
    expect(screen.queryByRole('button', { name: 'この範囲で検索' })).toBeNull();
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });

  it('toggles on via the switch', () => {
    const { onToggle } = setup({ enabled: false });
    fireEvent.click(screen.getByRole('switch'));
    expect(onToggle).toHaveBeenCalledWith(true);
  });
});
