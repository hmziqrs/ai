// The reference build: exits 1 when the build-fails fault is injected, so the probe self-test can see a failing build.
process.exit(process.env.FAULT === "build-fails" ? 1 : 0);
