import winston from "winston";
import devLogger from "./dev";
import productionLogger from "./production";
import testLogger from "./test";

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6,
};

let logger: winston.Logger | Console;

if (process.env.NODE_ENV === "production") {
  logger = productionLogger();
} else if (process.env.NODE_ENV === "test") {
  logger = testLogger();
} else {
  // Default: dev logger (handles "dev", "development", or unset NODE_ENV)
  logger = devLogger();
}

export default logger;
