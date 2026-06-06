// Vercel serverless entry point — re-exports the Express app
// Vercel calls this file as a Node.js serverless function for every request.
import { app } from "../src/index.js";

export default app;
