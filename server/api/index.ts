// Vercel serverless entry point — re-exports the Express app.
// This file must NOT live inside api/ because Vercel treats that directory
// as file-system routed functions, which would intercept /api/* before Express.
import { app } from "../src/index.js";

export default app;
