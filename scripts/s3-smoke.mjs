// Smoke test for S3 image uploads, through the running API.
//
//   OWNER_EMAIL=owner@shop.example OWNER_PASSWORD='...' node scripts/s3-smoke.mjs
//   (optional) BASE_URL=http://localhost:3000/api
//
// Signs in as a shop owner, asks POST /api/uploads for a presigned POST,
// uploads a 1x1 PNG straight to S3, then fetches the public URL. It writes one
// tiny object under salonly/salons/<salonId>/logo/ and changes nothing else:
// it does NOT save the URL on the shop.

const BASE = (process.env.BASE_URL || "http://localhost:3000/api").replace(/\/+$/, "");
const email = process.env.OWNER_EMAIL;
const password = process.env.OWNER_PASSWORD;

// A valid 1x1 PNG followed by zero padding. Decoders ignore bytes after IEND, and
// the padding lifts the file past the upload policy's 1 KB minimum.
function tinyPng() {
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
  return Buffer.concat([png, Buffer.alloc(1100)]);
}

const results = [];
function record(name, ok, detail = "") {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  - " + detail : ""}`);
  return ok;
}

async function main() {
  if (!email || !password) {
    console.error("Set OWNER_EMAIL and OWNER_PASSWORD (a shop owner login).");
    process.exit(2);
  }

  const login = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const loginBody = await login.json().catch(() => ({}));
  if (!record("owner login", login.ok && !!loginBody.token, `HTTP ${login.status}`)) return;
  const token = loginBody.token;

  const file = tinyPng();
  const presign = await fetch(`${BASE}/uploads`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ kind: "logo", contentType: "image/png", size: file.length }),
  });
  const target = await presign.json().catch(() => ({}));
  if (!record("presigned target", presign.ok && !!target.uploadUrl, `HTTP ${presign.status}${target.message ? " " + target.message : ""}`)) return;

  const form = new FormData();
  for (const [k, v] of Object.entries(target.fields)) form.append(k, v);
  form.append("file", new Blob([file], { type: "image/png" }), "smoke.png");
  const upload = await fetch(target.uploadUrl, { method: "POST", body: form });
  const uploadText = upload.ok ? "" : (await upload.text()).slice(0, 300);
  if (!record("upload to S3", upload.status === 204 || upload.status === 201 || upload.ok, `HTTP ${upload.status} ${uploadText}`)) return;

  const read = await fetch(target.publicUrl);
  record(
    "public read of uploaded image",
    read.ok && (read.headers.get("content-type") || "").startsWith("image/"),
    `HTTP ${read.status} ${target.publicUrl}${read.ok ? "" : " (bucket policy or CloudFront must allow public read of salonly/*)"}`,
  );
}

main()
  .catch((e) => record("unexpected error", false, e.message))
  .finally(() => {
    const failed = results.filter((r) => !r.ok).length;
    console.log(failed === 0 ? "\nAll checks passed." : `\n${failed} check(s) failed.`);
    process.exitCode = failed === 0 ? 0 : 1;
  });
