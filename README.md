# PR image upload for agents

A small authenticated HTTP service that uploads screenshots to Vercel Blob and returns a public URL. Agents can embed that URL in GitHub pull request descriptions.

```md
![Screenshot](https://....blob.vercel-storage.com/pr-images/...)
```

## Endpoint

```text
POST /api/upload
Authorization: Bearer <UPLOAD_TOKEN>
Content-Type: multipart/form-data
file=<image>
```

Allowed types: `image/png`, `image/jpeg`, `image/webp`, `image/gif`. Maximum size: 10 MB.

Success response:

```json
{
  "url": "https://..."
}
```

## Environment variables

| Name | Where | Purpose |
| --- | --- | --- |
| `UPLOAD_TOKEN` | Vercel (Production, Preview, Development) | Bearer token required by `POST /api/upload` |
| `BLOB_READ_WRITE_TOKEN` | Injected by Vercel when a Blob store is connected | Write access to the public Blob store |
| `IMAGE_UPLOAD_URL` | Local / agent environment | Deployment origin, e.g. `https://your-app.vercel.app` |
| `IMAGE_UPLOAD_TOKEN` | Local / agent environment | Same value as `UPLOAD_TOKEN`, used by the helper script |

Do not commit these values. Rotate `UPLOAD_TOKEN` from the Vercel project environment variables UI.

## Deploy

1. Create a Vercel project from this repository.
2. Create a **public** Vercel Blob store and connect it to the project for Production, Preview, and Development. Vercel will inject `BLOB_READ_WRITE_TOKEN`.
3. Generate a strong random token and set it as `UPLOAD_TOKEN` for Production, Preview, and Development.
4. Deploy.

## Upload with curl

```bash
IMAGE_URL=$(curl -s \
  -H "Authorization: Bearer $IMAGE_UPLOAD_TOKEN" \
  -F "file=@screenshot.png" \
  "$IMAGE_UPLOAD_URL/api/upload" \
  | jq -r '.url')
```

Paste the URL into a GitHub pull request description:

```md
![Screenshot](IMAGE_URL_HERE)
```

## Helper script

```bash
export IMAGE_UPLOAD_URL="https://your-app.vercel.app"
export IMAGE_UPLOAD_TOKEN="..." # same value as UPLOAD_TOKEN in Vercel

./scripts/upload-image.sh ./screenshot.png
```

The script prints only the public URL on stdout.
