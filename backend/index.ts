import { variables } from "./config/envLoader";
import Server from "./server";

let serverHandle: any;

const start = async () => {
    try {
        const PORT = variables.PORT || "3001";
        console.log(`Starting server on port ${PORT}...`);
        const app = new Server();
        serverHandle = await app.start(Number(PORT));
        console.log("Server startup sequence completed. Keep-alive active.");
        
        // Explicitly keep the process alive
        setInterval(() => {
            // This ensures the event loop has something to do
        }, 10000);
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}

start();

process.on("SIGTERM", (signal) => {
    console.debug(`Process ${process.pid} received a SIGTERM signal`);
    process.exit(0);
});

process.on("SIGINT", (signal) => {
    console.debug(`Process ${process.pid} has been interrupted`);
    process.exit(0);
});

process.on("uncaughtException", (err) => {
    console.error(`Uncaught Exception: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
