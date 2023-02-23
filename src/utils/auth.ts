import { sign } from "jsonwebtoken";
import { User } from "src/entity/User";
import { ACCESS_TOKEN_EXPIRES_IN, REFRESH_TOKEN_EXPIRES_IN } from "./constants";
import { randomBytes } from "crypto";

export const createAccessToken = (user: User) => {
  return sign(
    { user_id: user._id, token_version: user.token_version },
    process.env.ACCESS_TOKEN_SECRET!,
    {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    }
  );
};

export const createRefreshToken = (user: User) => {
  return sign(
    { user_id: user._id, token_version: user.token_version },
    process.env.REFRESH_TOKEN_SECRET!,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );
};

interface createRefreshTokenResponseParams {
  user?: User;
  spotify_access_token?: string;
  spotify_expires_in?: number;
}

export const createRefreshTokenResponse = ({
  user,
  spotify_access_token,
  spotify_expires_in,
}: createRefreshTokenResponseParams) => {
  if (!user) {
    return {
      ok: false,
      access_token: null,
      refresh_token: null,
      expires_in: null,
      user: null,
      spotify_access_token: null,
      spotify_expires_in: null,
    };
  } else if (!spotify_access_token || !spotify_expires_in) {
    return {
      ok: true,
      access_token: createAccessToken(user),
      refresh_token: createRefreshToken(user),
      expires_in: ACCESS_TOKEN_EXPIRES_IN,
      user: user,
      spotify_access_token: null,
      spotify_expires_in: null,
    };
  } else {
    return {
      ok: true,
      access_token: createAccessToken(user),
      refresh_token: createRefreshToken(user),
      expires_in: ACCESS_TOKEN_EXPIRES_IN,
      user: user,
      spotify_access_token: spotify_access_token,
      spotify_expires_in: spotify_expires_in,
    };
  }
};

export const generateOTP = async () => {
  const buffer = randomBytes(3);
  return parseInt(buffer.toString("hex"), 16).toString().slice(0, 6);
};
