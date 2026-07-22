# Program Assign

短期留学生受入プログラムについて、職員ごとの日別スケジュールを共有する内部向けNext.jsアプリです。

「誰が、何時に、どこで、何を担当しているか」を、職員別カード、全体タイムライン、ガント表示で確認できます。予定の編集はExcelで行い、職員はWeb画面から閲覧します。

## 現在の主な機能

- 共有パスワードによるログイン・ログアウト
- 日付選択、今日・前日・翌日への移動
- 職員別カード表示（予定なし表示を含む）
- 全体タイムライン表示
- ガント表示
- 職員名・Program名・Statusによる絞り込み
- Excelファイルのアップロードと入力内容の検証
- 印刷用表示
- Excel本体をブラウザへ直接公開しないサーバー側読込

## 通常の運用方法

1. 管理者が所定のExcelファイルを更新します。
2. アプリへログインします。
3. トップ画面右上の「Excelアップロード」を開きます。
4. `.xlsx`ファイルを選択し、「アップロードして反映」を実行します。
5. 入力内容の検証後、スケジュールデータがVercel Blobへ保存されます。
6. トップ画面を再読み込みし、予定件数と最終更新日時を確認します。

アップロード済みデータがある場合、アプリはそのデータを優先して表示します。通常の予定更新では、GitHubへのExcel差し替えやVercelの再デプロイは不要です。

## Excelの入力仕様

必須シートは次の2つです。

- `App_Data`
- `Master_Staff`

`App_Data`の必須列は次のとおりです。

- `Date`
- `StaffName`
- `StartTime`
- `EndTime`
- `ProgramName`
- `GatheringPlace`
- `EventName`
- `Status`

任意列として、`Role`、`GatheringTime`、`Destination`、`Notes`、`UpdatedAt`を利用できます。

`Master_Staff`がある場合は、`DisplayOrder`の順に職員カードを表示します。シート名と1行目の英語ヘッダーは変更しないでください。

アップロード時には、必須列、必須項目、日付、時刻などを検証します。問題がある場合は保存せず、対象行と内容を画面に表示します。

## データ保存と読込順序

アプリは次の順序でスケジュールデータを読み込みます。

1. Vercel Blobへアップロード済みのスケジュールデータ
2. `data/schedule.xlsx`
3. `data/schedule.seed.json`から生成・読込したサンプルデータ

`data/schedule.xlsx`は初期データまたはフォールバック用です。`.gitignore`の対象であり、通常のPRにはExcelバイナリを含めません。

`npm run dev`または`npm run build`の前に、`data/schedule.xlsx`が存在しない場合は、`scripts/create-sample-schedule.mjs`が`data/schedule.seed.json`からサンプルExcelを生成します。

## Excel本体を公開しない理由

Excelは`public`配下に置きません。`public`配下のファイルは、URLを知っていれば直接アクセスされる可能性があるためです。

アプリはサーバー側でExcelを読み込み、認証済みユーザーに`/api/schedule`経由でJSONのみを返します。未認証または不正なCookieの場合は401を返し、レスポンスには`Cache-Control: no-store`を設定しています。

アップロード後のスケジュールデータは、Vercel Blobのprivate領域へJSONとして保存します。

## ローカル起動方法

```bash
npm install
cp .env.example .env.local
npm run dev
```

必要な環境変数は次のとおりです。

- `APP_PASSWORD`：共有ログインパスワード（必須）
- `AUTH_COOKIE_SECRET`：Cookie署名用の十分長い秘密文字列（必須）
- `AUTH_COOKIE_NAME`：任意。未設定時は`staff_schedule_auth`
- `BLOB_READ_WRITE_TOKEN`：Vercel Blob接続時に使用

## Vercelの設定

1. GitHubリポジトリをVercelのNext.jsプロジェクトとして接続します。
2. Environment Variablesに`APP_PASSWORD`と`AUTH_COOKIE_SECRET`を設定します。
3. 必要に応じて`AUTH_COOKIE_NAME`を設定します。
4. Vercel StorageでBlob Storeを作成し、このプロジェクトへ接続します。
5. 接続後、再デプロイします。

Blob Storeが未接続の場合、Excelアップロード時にエラーを表示します。その場合はVercelのStorage設定を確認してください。

`next.config.mjs`の`outputFileTracingIncludes`により、`/api/schedule`の実行環境へ`data/schedule.xlsx`と`data/schedule.seed.json`を含める構成です。

## 検証コマンド

```bash
npm install
npm run build
npm run lint
```

## 本番環境の確認項目

- 未ログイン状態で`/api/schedule`が401を返す
- 共有パスワードでログインできる
- ログイン後に職員別カード、タイムライン、ガント表示を確認できる
- 日付選択と各フィルターが動作する
- 正常なExcelをアップロードできる
- 不正なExcelは保存されず、入力エラーが表示される
- アップロード後に予定件数と最終更新日時が更新される
- Excel本体へ直接アクセスできるURLが存在しない

## 現時点での運用方針

- Excelを予定編集の正本とします。
- Webアプリは閲覧とExcelアップロードに使用します。
- アプリ内での予定編集は行いません。
- Program Managerなど他の業務アプリとは独立して運用します。
- 将来はOneStop AI Platformのダッシュボードから本アプリへアクセスできる構成を目指します。

## 今後の候補

週間表示、月間表示、閲覧者とアップロード管理者の権限分離、職員別ログイン、Program別表示、担当重複チェック、現在時刻の担当強調、変更履歴、変更通知、OneDrive・Google Sheets連携、他アプリとのAPI連携などを、必要性を確認しながら小さなPRに分けて追加します。
