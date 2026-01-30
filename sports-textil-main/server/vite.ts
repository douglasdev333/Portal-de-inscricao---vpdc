import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";
import { storage } from "./storage";

const viteLogger = createLogger();

async function injectOpenGraphMeta(html: string, url: string, host: string): Promise<string> {
  const eventMatch = url.match(/^\/evento\/([^\/\?]+)/);
  
  if (eventMatch) {
    const slug = eventMatch[1];
    try {
      const event = await storage.getEventBySlug(slug);
      if (event) {
        const baseUrl = `https://${host}`;
        const eventUrl = `${baseUrl}/evento/${slug}`;
        const imageUrl = event.bannerUrl || `${baseUrl}/assets/generated_images/Marathon_runners_landscape_hero_b439e181.png`;
        
        const ogTags = `
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${eventUrl}" />
    <meta property="og:title" content="${event.nome}" />
    <meta property="og:description" content="${event.descricao?.substring(0, 200) || `Inscreva-se no evento ${event.nome}`}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${event.nome}" />
    <meta name="twitter:description" content="${event.descricao?.substring(0, 200) || `Inscreva-se no evento ${event.nome}`}" />
    <meta name="twitter:image" content="${imageUrl}" />`;
        
        html = html.replace('</head>', `${ogTags}\n  </head>`);
      }
    } catch (error) {
      console.error("Error injecting OG meta tags:", error);
    }
  }
  
  return html;
}

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      
      // Inject Open Graph meta tags for event pages
      const host = req.get('host') || 'localhost';
      template = await injectOpenGraphMeta(template, url, host);
      
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", async (req, res) => {
    const url = req.originalUrl;
    const indexPath = path.resolve(distPath, "index.html");
    
    try {
      let html = await fs.promises.readFile(indexPath, "utf-8");
      
      // Inject Open Graph meta tags for event pages
      const host = req.get('host') || 'localhost';
      html = await injectOpenGraphMeta(html, url, host);
      
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (error) {
      res.sendFile(indexPath);
    }
  });
}
