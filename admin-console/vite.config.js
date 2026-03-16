const path = require("path");
const { defineConfig } = require("vite");

module.exports = defineConfig({
  root: path.resolve(__dirname),
  server: {
    host: "0.0.0.0",
    port: 5174,
  },
  preview: {
    host: "0.0.0.0",
    port: 4174,
  },
  build: {
    target: "es2020",
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
  },
});
