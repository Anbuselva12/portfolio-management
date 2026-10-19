import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
const DEFAULT_DEV_SITE_URL = 'http://localhost:5173';
/** Paths served by Vite itself (assets, HMR, source modules) that must never fall back to the SPA shell. */
const isViteInternalPath = (url) => url.startsWith('/@') || url.startsWith('/src/') || url.startsWith('/node_modules/') || url.includes('.');
/**
 * Mirrors the production routing (see vercel.json): `/` is the static landing page,
 * every other app route is served by the SPA shell `app.html`.
 */
const spaFallbackPlugin = () => ({
    name: 'finfamily-spa-fallback',
    configureServer(server) {
        server.middlewares.use((req, _res, next) => {
            const path = (req.url ?? '/').split('?')[0];
            if (req.method === 'GET' && path !== '/' && !isViteInternalPath(path)) {
                req.url = '/app.html';
            }
            next();
        });
    },
});
/**
 * Injects the canonical origin (`%SITE_URL%`) and optional Search Console token into the
 * landing page, and emits robots.txt and sitemap.xml for that origin.
 */
const seoFilesPlugin = (siteUrl, googleVerification) => ({
    name: 'finfamily-seo-files',
    transformIndexHtml(html) {
        const origin = siteUrl.replace(/\/+$/, '');
        const verificationTag = googleVerification
            ? `<meta name="google-site-verification" content="${googleVerification.replace(/[^\w-]/g, '')}" />`
            : '';
        return html.replaceAll('%SITE_URL%', origin).replace('<!--GOOGLE_SITE_VERIFICATION-->', verificationTag);
    },
    generateBundle() {
        const origin = siteUrl.replace(/\/+$/, '');
        const lastmod = new Date().toISOString().slice(0, 10);
        this.emitFile({
            type: 'asset',
            fileName: 'robots.txt',
            source: [
                'User-agent: *',
                'Allow: /$',
                'Disallow: /api/',
                'Disallow: /dashboard',
                'Disallow: /settings',
                'Disallow: /onboarding',
                '',
                `Sitemap: ${origin}/sitemap.xml`,
                '',
            ].join('\n'),
        });
        this.emitFile({
            type: 'asset',
            fileName: 'sitemap.xml',
            source: [
                '<?xml version="1.0" encoding="UTF-8"?>',
                '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
                '  <url>',
                `    <loc>${origin}/</loc>`,
                `    <lastmod>${lastmod}</lastmod>`,
                '    <changefreq>monthly</changefreq>',
                '    <priority>1.0</priority>',
                '  </url>',
                '</urlset>',
                '',
            ].join('\n'),
        });
    },
});
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), 'VITE_');
    const siteUrl = env.VITE_SITE_URL || DEFAULT_DEV_SITE_URL;
    if (mode === 'production' && !env.VITE_SITE_URL) {
        console.warn('[seo] VITE_SITE_URL is not set — canonical, Open Graph and sitemap URLs will point to ' +
            `${DEFAULT_DEV_SITE_URL}. Set it to your public origin before deploying.`);
    }
    return {
        plugins: [react(), tailwindcss(), spaFallbackPlugin(), seoFilesPlugin(siteUrl, env.VITE_GOOGLE_SITE_VERIFICATION)],
        appType: 'mpa',
        resolve: {
            alias: {
                '@': `${import.meta.dirname}/src`,
            },
        },
        build: {
            rollupOptions: {
                input: {
                    landing: `${import.meta.dirname}/index.html`,
                    app: `${import.meta.dirname}/app.html`,
                },
            },
        },
    };
});
