# 職員スケジュール管理 MVP

短期留学生受入プログラムの職員6名について、日ごとの「誰が、何時に、どこで、何を担当しているか」を閲覧する内部向けNext.jsアプリです。編集はExcelを田中さんが行い、職員はWeb画面で閲覧のみ行います。

## ローカル起動方法

```bash
npm install
cp .env.example .env.local # または下記環境変数を設定
npm run dev
```

必要な環境変数:

- `APP_PASSWORD`: 共有ログインパスワード（必須）
- `AUTH_COOKIE_SECRET`: Cookie署名用の十分長い秘密文字列（必須）
- `AUTH_COOKIE_NAME`: 任意。未設定時は `staff_schedule_auth`

## Excelファイルの置き場所と更新手順

Excelは必ず `data/schedule.xlsx` に配置します。`public` には置きません。田中さんがExcelを更新したら、このファイルを差し替えて再デプロイします。

アプリが読む正本シートは `App_Data` のみです。必須列は `Date`, `StaffName`, `StartTime`, `EndTime`, `ProgramName`, `GatheringPlace`, `EventName`, `Status` です。`Master_Staff` がある場合は `DisplayOrder` 順に職員カードを表示します。

## `/public` にExcelを置かない理由

`public` 配下のファイルはURLを知っていれば直接アクセスされる可能性があります。このMVPではExcel本体をブラウザに渡さず、認証済みユーザーだけが `/api/schedule` 経由でJSONを取得します。

## `/api/schedule` の仕組み

Route HandlerはNode.js runtimeで動作し、サーバー側で `fs` と `path` を使って `data/schedule.xlsx` を読み込みます。`xlsx` はサーバー側の `lib/excel.ts` でのみ使用し、レスポンスにはJSONだけを返します。未認証または不正Cookieの場合は401を返し、レスポンスには `Cache-Control: no-store` を付けています。

## Vercelデプロイ方法

1. GitHub等にpushし、VercelでNext.jsプロジェクトとしてimportします。
2. VercelのEnvironment Variablesに `APP_PASSWORD` と `AUTH_COOKIE_SECRET` を必ず設定します。
3. `data/schedule.seed.json` と `scripts/create-sample-schedule.mjs` がリポジトリに含まれていることを確認します。実際の運用Excelを使う場合は、Vercelビルド前に `data/schedule.xlsx` を別途配置します。
4. `npm run build` の `prebuild` で、`data/schedule.xlsx` が存在しない場合はサンプルExcelを自動生成します。
5. Vercelでは `next.config.mjs` を使います。`outputFileTracingIncludes` により `/api/schedule` 実行環境へ `./data/schedule.xlsx` が含まれる構成です。

## Vercel本番環境での確認項目

- 未ログイン状態で `/api/schedule` が401になる
- ログイン後に `/api/schedule` がJSONを返す
- 職員別カードと全体タイムラインが表示される
- Excelを差し替えて再デプロイすると画面に反映される
- `/public/schedule.xlsx` のようなExcel本体への直接アクセスが存在しない

## MVPでできること

- 共有パスワードログイン・ログアウト
- 日付選択、今日・前日・翌日移動
- 職員別カード表示（予定なし表示を含む）
- 全体タイムライン表示
- 職員名・プログラム名・ステータスフィルター
- Excel日付シリアル値、文字列日付、Excel時刻値、文字列時刻の変換
- 印刷用CSS（ナビゲーション・フィルターを非表示）

## 今後追加予定の機能

週間表示、月間表示、OneDrive/Google Sheets連携、DB保存、職員別ログイン、編集機能、変更履歴、変更通知、PDF出力、プログラム別表示、今日の担当一覧、現在時刻での担当強調表示。

## 検証コマンド

依存関係を固定しているため、通常のネットワーク環境では以下で検証します。

```bash
npm install
npm run build
npm run lint
```

このCodex環境では、npm registryへのHTTPS CONNECTがプロキシで403になり、`@types/node` などscoped packageを取得できないため `npm install` が完了しませんでした。ローカルまたはVercelでは、上記コマンドが成功することを確認してください。

## API動作確認手順

ローカル起動後、未ログイン時の401を確認します。

```bash
curl -i http://localhost:3000/api/schedule
```

ログイン後にJSONが返ることを確認します。

```bash
curl -i -c /tmp/staff-cookie.txt \
  -H 'Content-Type: application/json' \
  -d '{"password":"YOUR_APP_PASSWORD"}' \
  http://localhost:3000/api/login

curl -i -b /tmp/staff-cookie.txt http://localhost:3000/api/schedule
```

レスポンスの `items[].date` が `yyyy-mm-dd`、`items[].startTime` / `items[].endTime` / `items[].gatheringTime` が `HH:mm` になっていることを確認してください。サンプルExcelにはExcel日付シリアル値・時刻シリアル値と文字列日付・時刻の両方を含めています。

## Excel差し替え手順

1. 田中さんがExcelを更新します。
2. ファイル名を `schedule.xlsx` にして、リポジトリの `data/schedule.xlsx` を置き換えます。
3. `public` には絶対に置かないでください。
4. GitにコミットしてVercelへ再デプロイします。
5. 本番でログイン後、画面の最終更新日時と予定内容が更新されていることを確認します。

## Vercel環境変数

Vercel Project Settings > Environment Variables に以下を設定します。

- `APP_PASSWORD`: 職員共有パスワード
- `AUTH_COOKIE_SECRET`: Cookie署名用の長いランダム文字列
- `AUTH_COOKIE_NAME`: 任意。未設定なら `staff_schedule_auth`

Production / Preview / Development の必要な環境に設定し、設定後に再デプロイしてください。

## PR提出前の未完了確認と代替確認手順

Codex環境では npm registry へのアクセスがプロキシ制限により403となるため、以下のコマンドはこの環境内では実行確認が未完了です。

```bash
npm install
npm run build
npm run lint
npm run dev
```

PRレビュー時またはマージ前に、ローカル環境、Vercel、またはGitHub Actionsなど npm registry にアクセスできる環境で、必ず上記4コマンドを確認してください。

あわせて、Vercel本番環境では以下を確認してください。

1. Environment Variables に `APP_PASSWORD`、`AUTH_COOKIE_SECRET`、必要に応じて `AUTH_COOKIE_NAME` を設定すること。
2. `data/schedule.xlsx` はリポジトリの `data` 配下に置き、`public` には絶対に移動しないこと。
3. 未ログイン状態で `/api/schedule` にアクセスすると401になること。
4. ログイン後に `/api/schedule` がスケジュールJSONを返すこと。
5. 画面表示はExcel本体を直接読まず、必ず `/api/schedule` のJSONを利用していること。

## Codex PRでのExcelバイナリ除外

CodexのPRでは `.xlsx` バイナリファイルを差分に含めません。`data/schedule.xlsx` は `.gitignore` で除外し、PRにはテキスト形式の `data/schedule.seed.json` と生成スクリプトだけを含めます。

MVPでは、`npm run dev` または `npm run build` の前に `scripts/create-sample-schedule.mjs` が実行されます。このスクリプトは `data/schedule.seed.json` の `App_Data` と `Master_Staff` からサンプルExcelを生成します。既に `data/schedule.xlsx` が存在する場合は上書きしません。

本番運用では、田中さんが更新した実際のExcelを `data/schedule.xlsx` として別途配置・差し替えしてください。サンプル生成は、ファイルが存在しない場合のMVP起動補助です。

`data/schedule.xlsx` はサーバー側Route Handlerが読むためのファイルです。セキュリティ上、`/public` には絶対に置かないでください。ブラウザはExcel本体を直接読み込まず、認証済みの場合だけ `/api/schedule` のJSONを取得します。


## Next.js設定ファイル

Vercelでは `next.config.ts` がサポートされない環境があるため、このMVPでは `next.config.mjs` を使用します。TypeScript型注釈は使わず、JSDocの `/** @type {import('next').NextConfig} */` で型を示しています。`outputFileTracingIncludes` の設定は維持し、`/api/schedule` がサーバー実行環境で `data/schedule.xlsx` を読める構成にしています。
