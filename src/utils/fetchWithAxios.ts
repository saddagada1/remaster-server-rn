import axios, { AxiosError } from "axios";
import axiosRetry from "axios-retry";

axiosRetry(axios, {
  retries: 3,
  retryCondition: (error) => {
    return true;
  },
  retryDelay: axiosRetry.exponentialDelay,
  onRetry: (retryCount) => {
    console.log("retry: ", retryCount);
  },
});

export interface FetchError {
  error: string;
}

interface SpotifyClientAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export const fetchSpotifyAuth = async (retries: number) => {
  try {
    const response = await axios.post<SpotifyClientAuthResponse>(
      "https://accounts.spotify.com/api/token",
      {
        grant_type: "client_credentials",
      },
      {
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(
              process.env.SPOTIFY_API_CLIENT_ID + ":" + process.env.SPOTIFY_API_CLIENT_SECRET,
              "utf-8"
            ).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        "axios-retry": {
          retries: retries,
        },
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const serverError = error as AxiosError<FetchError>;
      if (serverError && serverError.response) {
        return serverError.response.data;
      }
    }
    return { error: "Failed to Connect to Spotify" };
  }
};
