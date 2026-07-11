import { render, screen, fireEvent } from '@testing-library/react';
import SpotList from './SpotList';
import type { Spot } from '@/lib/types';

const spots: Spot[] = [
  { id: 1, name: '東京タワー', category: '観光名所', address: '港区', lat: 35.6, lng: 139.7, distanceM: 0 },
  { id: 2, name: '六本木ヒルズ', category: '観光名所', address: '港区', lat: 35.66, lng: 139.72, distanceM: 1494 },
  { id: 3, name: '新宿御苑', category: '公園', address: '新宿区', lat: 35.68, lng: 139.71, distanceM: 500 },
];

describe('SpotList', () => {
  it('shows the result count and every spot', () => {
    render(<SpotList spots={spots} selectedId={null} onSelect={() => {}} />);
    expect(screen.getByText('3件のスポット')).toBeInTheDocument();
    expect(screen.getByText('東京タワー')).toBeInTheDocument();
    expect(screen.getByText('新宿御苑')).toBeInTheDocument();
  });

  it('formats distances (m and km)', () => {
    render(<SpotList spots={spots} selectedId={null} onSelect={() => {}} />);
    expect(screen.getByText('1.5km')).toBeInTheDocument();
    expect(screen.getByText('500m')).toBeInTheDocument();
  });

  it('renders an empty state when there are no spots', () => {
    render(<SpotList spots={[]} selectedId={null} onSelect={() => {}} />);
    expect(screen.getByText('0件のスポット')).toBeInTheDocument();
    expect(screen.getByText('この範囲にスポットはありません')).toBeInTheDocument();
  });

  it('calls onSelect with the id when a row is clicked', () => {
    const onSelect = jest.fn();
    render(<SpotList spots={spots} selectedId={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('六本木ヒルズ'));
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it('deselects when the already-selected row is clicked', () => {
    const onSelect = jest.fn();
    render(<SpotList spots={spots} selectedId={2} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('六本木ヒルズ'));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('shows a loading message instead of the empty state while loading', () => {
    render(<SpotList spots={[]} selectedId={null} onSelect={() => {}} loading />);
    expect(screen.getByText('読み込み中…')).toBeInTheDocument();
    expect(screen.queryByText('この範囲にスポットはありません')).toBeNull();
  });
});
