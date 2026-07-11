# Landit 位置情報探索アプリ

地図上でスポット（約200件）を周辺検索できるフルスタック Web アプリケーションです。
地図を操作しながら、表示範囲内のスポット一覧・中心地点の住所・半径検索を行えます。

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS + Google Maps
- **Backend:** NestJS + TypeORM
- **Database:** PostgreSQL + PostGIS
- **Infra:** Docker / Docker Compose

## 主な機能

- **全国表示スタート**：初回は全スポットが収まるよう自動ズーム（fitBounds）。
- **中央固定マーカー**：地図中央に常にマーカー。地図クリックでその地点が中央へ移動（panTo）。
- **ビューポート連動リスト**：現在の表示範囲内のスポットを左サイドに一覧表示。地図操作に追従。
- **半径検索**：スライダー/プリセットで半径(km)を指定し、「この範囲で検索」ボタンで中央マーカーから半径 N km 以内を抽出（PostGIS `ST_DWithin`）。円を描画し、「クリア」で通常表示へ。
- **中心地点の住所表示**：地図中心の住所を常時表示（逆ジオコーディング）。
- **地図⇄リスト連動**：マーカー/リストのクリックで相互ハイライト＋詳細ポップアップ（名前・カテゴリ・住所）。

---

## アーキテクチャ

```
[ Next.js (fe) :3000 ]  地図UI・リスト・住所表示・各種キャッシュ
        │ REST (GET + query params)
        ▼
[ NestJS (api) :4000 ]  スポット検索 / 逆ジオコーディングProxy＋キャッシュ
        │ TypeORM
        ▼
[ PostgreSQL + PostGIS (db) :5433 ]  geography(Point) + GiST index
        ▲
   docker-compose up 時に CSV を自動インポート
```

---

## 環境構築

### 前提

- Docker / Docker Compose（Compose v2 以降）
- （ローカルでフロント/バックを直接動かす場合のみ）Node.js 20

### セットアップ

```bash
# 1. 環境変数ファイルを作成
cp .env.example .env

# 2. Google Maps の APIキーを .env に設定（後述）
#    未設定でもアプリは起動します（住所はフォールバック表示）

# 3. 起動（DB/API/FE を一括ビルド・起動、CSVも自動インポート）
docker compose up --build
```

起動後、ブラウザで **http://localhost:3000** を開きます。

| サービス | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:4000 |
| PostgreSQL | localhost:5433（ホスト公開ポート。ローカルの5432と衝突しないよう5433に設定） |

### 停止 / クリーンアップ

```bash
docker compose down       # 停止（データは保持）
docker compose down -v    # DBボリュームごと削除（次回起動時にCSVを再インポート）
```

---

## APIキーの設定（Google Maps）

セキュリティのため、キーはリポジトリに含めず `.env`（gitignore対象）で管理します。`.env.example` にプレースホルダを用意しています。

```env
# 地図表示用（ブラウザに露出。JavaScript Maps API を有効化）
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_js_api_key
# 逆ジオコーディング用（バックエンドで秘匿。Geocoding API を有効化）
GOOGLE_GEOCODING_API_KEY=your_google_geocoding_api_key
```

- **キー未設定（`dummy_...`）でも起動可能**：地図タイルは Google の認証エラーになりますが、アプリの構造・APIは動作します。逆ジオコーディングは「緯度○, 経度○ 付近」というフォールバック表示になります。
- `NEXT_PUBLIC_*` はビルド時にバンドルへ埋め込まれるため、キーを変更したら `docker compose up --build` で再ビルドしてください。

---

## 使用した主要ライブラリとその選定理由

| 分類 | ライブラリ | 選定理由 |
|---|---|---|
| 地図 | **@vis.gl/react-google-maps** | Google 公式系の React ラッパー。`useMap` 等の Hooks で地図インスタンスを扱え、宣言的にマーカー/InfoWindow を記述できる。課題例示の Google Maps を素直に統合できる。 |
| DB空間拡張 | **PostGIS** | 「半径N km以内」「範囲内」を DB 側で正確・高速に計算できる。`geography(Point)` + GiST インデックスで、データ増加時もスケールする。課題でも推奨。 |
| ORM | **TypeORM** | 課題指定。Entity でテーブルを型付けしつつ、PostGIS 特有の関数は QueryBuilder で生SQL相当を書き分けられる柔軟性。 |
| APIサーバ | **NestJS** | 課題指定。Controller/Service/Module の責務分離と DI により、小規模でも見通しよく構成できる。 |
| フロント | **Next.js (App Router)** | 課題指定。クライアントコンポーネント中心のシンプルな1画面構成に適合。 |
| スタイル | **Tailwind CSS** | 課題指定。2カラムレイアウトやオーバーレイUIを素早く構築。 |
| テスト | **Jest / Testing Library** | ロジック（純関数）とコンポーネント結線の両方を軽量に検証。 |

---

## 実装時に特に工夫した点・技術的な判断

### 1. API 設計：GET + クエリパラメータに統一
スポット検索は「取得」操作のため **GET + クエリパラメータ**を採用。RESTのセマンティクスに忠実で、**HTTPキャッシュ（ブラウザ/CDN）が効く**ためコスト削減に直結します（`/spots`・`/geocode/reverse` に `Cache-Control` を付与）。1エンドポイント `/spots` を、渡すクエリ（bbox / radius / なし）で分岐させ、シンプルに保っています。

### 2. PostGIS を活かした空間検索
座標は `lat/long` を別々に持たず **`geography(Point, 4326)` に集約**し、GiST インデックスを付与。
- 半径検索：`ST_DWithin`（インデックスで絞り込み）＋ `ST_Distance`（近い順ソート）
- 範囲検索：`&&`（バウンディングボックス重なり演算子）＋ `ST_MakeEnvelope`
- CSV投入時の `ST_MakePoint(long, lat)` の**引数順（経度→緯度）**に注意して変換。

### 3. 逆ジオコーディングのコスト最適化（多層）
中心住所は地図移動のたびに必要になり、API コストが嵩みやすいため多層で抑制：
- **距離しきい値**：中心が 50m 未満しか動いていなければ再取得しない。
- **座標の量子化**：座標を約110mグリッドに丸めてキャッシュキー化（わずかな移動は同一キーに集約）。
- **フロント側キャッシュ**＋**サーバ側キャッシュ**＋**HTTP Cache-Control** の多層構成。
- キーをバックエンドに秘匿するため、**NestJS をプロキシ**として経由。

### 4. ビューポート包含キャッシュ（内側移動はAPIを叩かない）
「取得済み範囲の内側にズームインした場合、既に取得済みのデータで対応可能」という点に着目。
- 直近の**完全取得済み範囲**を保持し、新しい表示範囲がその内側に収まるなら**フロントでフィルタするだけ**でAPIを呼びません。
- 範囲外へ出たときのみ debounce 付きで再取得。取得は LIMIT を掛けていない＝常に完全なので、絞り込みで取りこぼしが起きません。

### 5. データ増加を見据えたスケール指向
現状200件はフロント計算でも十分ですが、**データ増加時に破綻しない**設計を優先し、リストは常に「表示範囲＋バックエンド取得」に統一。総データ量に依存せず、見えている分だけを扱います。

### 6. UX 配慮
地図移動/検索中のローディング表示、検索結果0件のハンドリング、検索ボタンの二重送信防止、地図⇄リストの連動ハイライト・詳細ポップアップ・半径円のライブ描画など、直感的に操作できるUIを重視しました。

---

## API 仕様

| メソッド | エンドポイント | 説明 |
|---|---|---|
| GET | `/spots` | 全スポット |
| GET | `/spots?minLat&minLng&maxLat&maxLng` | ビューポート（範囲）検索 |
| GET | `/spots?lat&lng&radius` | 半径検索（radius は km）。距離順・`distanceM` 付き |
| GET | `/geocode/reverse?lat&lng` | 逆ジオコーディング（`{ address, cached }`） |

---

## テスト

```bash
# バックエンド（ユニット）
cd backend && npm install && npm test

# フロントエンド（ユニット + コンポーネント）
cd frontend && npm install && npm test

# DB 自動インポートのスモークテスト（db 起動中に実行）
docker compose up -d db
./db/test/db-smoke-test.sh
```

- **Backend**：検索モード判定 / 結果マッピング / 逆ジオの量子化・キャッシュ挙動
- **Frontend**：debounce・距離計算・住所リゾルバ・ビューポート包含判定などの純ロジック＋各コンポーネントの結線
- **DB**：件数・座標のround-trip・`ST_DWithin`・GiSTインデックス

---

## 時間が足りず簡略化した箇所・今後の改善点

- **取得件数の LIMIT / ページング**：現状は範囲内全件を返却。データが激増した場合は `LIMIT` ＋ `isComplete` フラグ（取得が打ち切られたか）＋ページングの導入が必要。
- **マーカークラスタリング**：多数マーカー同時描画時の可読性・描画負荷対策として、フロントは `@googlemaps/markerclusterer`、超大規模ならPostGISのサーバ側クラスタリングを検討。
- **キャッシュの共有化**：サーバ側の逆ジオキャッシュはプロセス内メモリ。複数インスタンス構成にするなら Redis へ置き換えて共有・可用性を向上。
- **カテゴリ絞り込み / 現在地取得**：カテゴリ別の色分け・フィルタや、Geolocation による現在地ジャンプは歓迎要件として今後追加余地あり。
- **E2E テスト**：地図描画を伴う操作は現状ユニット/結線テスト中心。Playwright 等での E2E は今後の課題。

---

## ディレクトリ構成

```
Landit-test-app/
├─ docker-compose.yml           # db / api / fe を一括起動
├─ .env.example                 # APIキー等のプレースホルダ
├─ landit_coding_test_seed.csv  # シードデータ
├─ db/
│  ├─ init/                     # 起動時に実行（PostGIS有効化・テーブル・CSV自動インポート）
│  └─ test/                     # DBスモークテスト
├─ backend/                     # NestJS + TypeORM
│  └─ src/
│     ├─ spots/                 # スポット検索（bbox / radius）
│     └─ geocode/               # 逆ジオコーディングProxy＋キャッシュ
└─ frontend/                    # Next.js (App Router)
   └─ src/
      ├─ app/                   # ルート・レイアウト
      ├─ components/            # 地図・リスト・半径UI・住所バー 等
      └─ lib/                   # API/ロジック（debounce・住所リゾルバ・包含キャッシュ）
```
