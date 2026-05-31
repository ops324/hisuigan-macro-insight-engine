// 絶対 URL の基点。OG タグ・sitemap・robots で使用。
// 本番ドメインは NEXT_PUBLIC_SITE_URL で上書き可能。未設定時は Vercel の本番URL → localhost の順でフォールバック。
export const SITE_URL: string =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const SITE_NAME = "翡翠眼";
