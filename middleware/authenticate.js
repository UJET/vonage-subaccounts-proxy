import dotenv from "dotenv";
import { Buffer } from "buffer";
dotenv.config();

export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    console.log("No auth headers!");
    return res.status(401).json("No auth headers!");
  }

  const [auth_api_key, auth_api_secret] = Buffer.from(
    authHeader.split(" ")[1],
    "base64"
  )
    .toString()
    .split(":");

  if (!auth_api_key || !auth_api_secret) {
    console.log("Invalid Authorization Header!");
    return res.status(401).json("Invalid Authorization Header!");
  }

  req.auth_api_key = auth_api_key;
  req.auth_api_secret = auth_api_secret;

  next();
};
