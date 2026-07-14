# 環境構築
- リポジトリをclone
        - git clone https://github.com/kouki223/Landit-test-app.git
- 環境変数を.envに入力する
        - cp .env.example .env を実行して.envファイルを作成
                - .envファイル内にAPI keyを準備する
                        - GOOGLE_GEOCODING_API_KEY => 逆ジオコーディング用のAPI key
                        - NEXT_PUBLIC_GOOGLE_MAPS_API_KEY => => UI上で地図を表示するためのmap用API key
- ターミナルでリポジトリルートからスクリプトファイルを実行して環境構築が完了している事を確認する
        - {ここに環境構築が完了しているかを確認するスクリプト化したshファイルを用意する}

# 実行手順
1. Docker 起動（DB/BE(API)/FE を一括でビルド・起動、CSVも自動インポート）
docker compose up --build
2. ブラウザで下記のURLを開く
http://localhost:3000
3. 期待する動作が行えるか確認する
- 地図を動かすと表示範囲のスポットが左に一覧表示
- 「半径検索」をONにして半径を指定 →「この範囲で検索」
4. 停止
docker compose down          # 停止（データ保持）
docker compose down -v       # DBも削除（次回起動でCSV再インポート）

# 使用した主要ライブラリとその選定理由

# **実装時に特に工夫した点、および技術的な判断を行った箇所**
- 実装時に工夫した点
        - 

- 技術的な判断を行った箇所
        - API keyを置く場所について
                - 環境変数などは、.envファイルで管理していますが、Google map API keyはフロント側で読み込んでいます。
                - API keyがフロント側で見えてしまう状態は良くない状態だと思いますが、API key側でプロキシを設定する方針にしたいと思います。（本番運用において）
        - 

# 時間が足りず実装を簡略化した箇所や、今後の改善点（あれば）
- 今後の改善点
        - 