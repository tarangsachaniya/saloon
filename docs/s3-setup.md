# S3 setup

Image uploads (`salonly/salons/*`) and Android release builds (`salonly/app-releases/*`) go
straight from the browser/app to S3 via presigned POST.

## Env (server only)

`AWS_REGION`, `AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and optionally
`AWS_CLOUDFRONT_URL` (public base URL; defaults to the bucket's S3 URL).

The IAM user needs `s3:PutObject` and `s3:GetObject` on `salonly/*` (GetObject is used by the
HEAD check when a release is registered).

## CORS (needed for browser uploads)

```json
[
  {
    "AllowedOrigins": ["https://salon.priinteve.com", "http://localhost:3000"],
    "AllowedMethods": ["POST"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": []
  }
]
```

## Public read

Objects under `salonly/*` must be readable by the app: either the bucket policy allows
`s3:GetObject` on `salonly/*` publicly, or `AWS_CLOUDFRONT_URL` points to a CloudFront
distribution with access to the bucket. The Android app downloads the APK from
`<base>/salonly/app-releases/<uuid>.apk` with no credentials.

## Releasing an Android build

1. Bump `expo.android.versionCode` (and `expo.version`) in `Android/app.json`.
2. `cd Android/android && gradlew assembleRelease` (signed with the release keystore).
3. Platform admin -> App releases: choose the APK, enter the same version name and code,
   tick Mandatory if old builds must update, Publish.

The new `AppRelease` table needs the migration `20261005140000_app_release`
(`npx prisma migrate deploy`).
