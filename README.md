# 郵便番号プロセッサ

## 概要
日本の郵便番号データをダウンロード、処理し、AWS S3にアップロードするNode.jsアプリケーションです。日本郵便のウェブサイトからデータを取得し、CSVからJSONに変換し、S3バケットにアップロードします。

## 特徴
- 日本郵便から郵便番号の入ったZIPファイルをダウンロード
- ZIPファイルを解凍し、CSVデータをJSON形式に変換
- 郵便番号をフィルタリングおよび重複排除
- 処理されたデータをAWS S3にアップロード

## 郵便情報の取得方法
https://<バケット名>.s3-<AWSリージョン>.amazonaws.com/<郵便番号上3桁>/<郵便番号下4桁>.json

## 必要条件
- Node.js
- 保存するS3バケット
- S3権限を持つAWSアカウント

## インストール

1. リポジトリをクローン:
    ```bash
    git clone git@github.com:fukuhito015/zipcode-to-s3.git
    cd zipcode-to-s3
    ```

2. 依存関係をインストール:
    ```bash
    npm i
    ```

3. ルートディレクトリに `.env` ファイルを作成し、以下の環境変数を追加:
    ```env
    AWS_ACCESS_KEY_ID=your_access_key_id
    AWS_SECRET_KEY=your_secret_key
    AWS_S3_BUCKET_NAME=your_s3_backet_name
    IS_ALL_UPLOAD=1  # 全ての郵便番号をアップロードする場合は '1'、変更された郵便番号のみをアップロードする場合は '0' に設定
    ```

## 使い方

1. アプリケーションを実行:
    ```bash
    node index.js
    ```

## 環境変数
- `AWS_ACCESS_KEY_ID`: AWSアクセスキーID
- `AWS_SECRET_KEY`: AWSシークレットキー
- `AWS_S3_BUCKET_NAME`: AWSアクセスキーID
- `IS_ALL_UPLOAD`: 全ての郵便番号をアップロードするか、変更された郵便番号のみをアップロードするかの設定 (1 または 0)

## 注意事項
- 必ずAWSのアクセスキーとシークレットキーを安全に管理してください。
- `.env` ファイルをバージョン管理システムに追加しないでください。
