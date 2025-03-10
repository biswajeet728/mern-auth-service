import { JwtPayload, sign } from "jsonwebtoken";
import { Config } from "../config";
import { UserRespose } from "../types";
import { db } from "../config/db";
import { refreshTokens } from "../schema";
import { eq } from "drizzle-orm";
import { ErrorHandler } from "./ErrorService";

export const generateAccessToken = (payload: JwtPayload) => {
  const token = sign(payload, Config.JWT_SECRET!, {
    expiresIn: "1d",
    issuer: "auth-service",
  });

  return token;
};

export const generateRefreshToken = (payload: JwtPayload) => {
  // Ensure payload.id is a string to avoid BigInt issues
  const token = sign(payload, Config.REFRESH_TOKEN_SECRET!, {
    expiresIn: "1y",
    issuer: "auth-service",
    jwtid: String(payload.id), // Convert to string
  });

  return token;
};

export const persistRefreshToken = async (user: UserRespose) => {
  const MS_IN_YEAR = 1000 * 60 * 60 * 24 * 365; // 1 year

  // Insert refresh token into the database
  const res = await db?.insert(refreshTokens).values({
    userId: BigInt(user.id), // Assuming user.id is a BigInt
    expiresAt: new Date(Date.now() + MS_IN_YEAR),
  });

  if (!res) {
    throw new ErrorHandler(
      "Failed to store the refresh token in the database",
      500
    );
  }

  // Retrieve the stored refresh token for the user
  const userData = await db
    ?.select()
    .from(refreshTokens)
    .where(eq(refreshTokens.userId, BigInt(user.id)))
    .execute();

  // Ensure that userData exists and has the expected structure
  if (!userData || userData.length === 0) {
    throw new ErrorHandler(
      "Failed to retrieve the refresh token from the database",
      500
    );
  }

  // Return the userId from the stored refresh token
  return userData?.[0].userId.toString(); // Convert BigInt to string if necessary
};

export const findRefreshToken = async (token: string) => {
  const res = await db
    ?.select()
    .from(refreshTokens)
    .where(eq(refreshTokens.userId, BigInt(token)))
    .execute();

  return res?.[0];
};

export const deleteRefreshToken = async (token: string) => {
  await db
    ?.delete(refreshTokens)
    .where(eq(refreshTokens.id, Number(token)))
    .execute();
};
