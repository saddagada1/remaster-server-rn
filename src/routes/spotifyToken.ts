import { Request, Response, Router } from "express";
import { FetchError, fetchSpotifyAuth } from "../utils/fetchWithAxios";

interface SpotifyTokenResponse {
  ok: boolean;
  spotify_access_token: string | null;
  spotify_expires_in: number | null;
}

const spotifyRoute = Router();

spotifyRoute.get("/", async (_req: Request, res: Response<SpotifyTokenResponse | FetchError>) => {
  const data = await fetchSpotifyAuth(0);
  if ("error" in data) {
    return res.status(504).send({
      error: "Failed to Connect to Spotify",
    });
  }
  return res.status(200).send({
    ok: true,
    spotify_access_token: data.access_token,
    spotify_expires_in: data.expires_in,
  });
});

export default spotifyRoute;
