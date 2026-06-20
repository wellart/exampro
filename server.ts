import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { initDb } from "./server/db";
import { seedIfEmpty } from "./server/seed";
import authRoutes from "./server/routes/auth";
import examRoutes from "./server/routes/exams";
import submissionRoutes from "./server/routes/submissions";
import questionRoutes from "./server/routes/questions";
import dashboardRoutes from "./server/routes/dashboard";
import userRoutes from "./server/routes/users";
import mailRoutes from "./server/routes/mail";

const app = express();
const PORT = 3000;

// Initialize database
initDb();
seedIfEmpty();

// Middleware
app.use(express.json({ limit: "20mb" }));

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "healthy", time: new Date().toISOString() });
});

// Route mounting
app.use("/api/auth", authRoutes);
app.use("/api/exams", examRoutes);
app.use("/api", submissionRoutes); // handles /api/submissions and /api/exams/:id/submit
app.use("/api/questions", questionRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/users", userRoutes);
app.use("/api/mail", mailRoutes);

// Vite dev server or static serving
if (!process.env.VERCEL) {
  async function startServer() {
    if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (_req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  }
  startServer();
}

export default app;
