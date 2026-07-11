'use client';

interface AddressBarProps {
  address: string | null;
  loading?: boolean;
}

export default function AddressBar({ address, loading = false }: AddressBarProps) {
  return (
    <div className="flex items-center gap-2 border-b bg-white px-4 py-2 text-sm">
      <span aria-hidden>📍</span>
      <span className="shrink-0 font-semibold text-gray-700">中心地点:</span>
      <span className="truncate text-gray-800">
        {loading ? '住所を取得中…' : (address ?? '—')}
      </span>
    </div>
  );
}
