
try {
    const server = require("@simplewebauthn/server");
    console.log("Successfully imported @simplewebauthn/server");
    console.log("Generate function available:", typeof server.generateAuthenticationOptions);
} catch (error) {
    console.error("Failed to import @simplewebauthn/server:", error.message);
    process.exit(1);
}
