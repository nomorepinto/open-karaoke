import { useState, useEffect } from "react";

const channelID = "UCutZyApGOjqhOS-pp7yAj4Q";

export function useGetKaraokeVideos() {
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        async function fetchTopKaraokeVideos() {
            try {
                setIsLoading(true);
                setError(null);

                const apiKey = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY ;
                if (!apiKey) {
                    throw new Error("Missing YouTube API Key (EXPO_PUBLIC_YOUTUBE_API_KEY).");
                }

                // 1. Get channel's Uploads Playlist ID
                const channelRes = await fetch(
                    `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelID}&key=${apiKey}`
                );

                if (!channelRes.ok) {
                    const errData = await channelRes.json().catch(() => ({}));
                    throw new Error(errData?.error?.message || `Failed to fetch channel details (Status ${channelRes.status})`);
                }

                const channelData = await channelRes.json();
                if (!channelData.items || channelData.items.length === 0) {
                    throw new Error("Channel details not found.");
                }

                const uploadsId = channelData.items[0]?.contentDetails?.relatedPlaylists?.uploads;
                if (!uploadsId) {
                    throw new Error("Uploads playlist ID not found for this channel.");
                }

                // 2. Fetch up to 50 videos from the uploads playlist
                const playlistRes = await fetch(
                    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsId}&maxResults=50&key=${apiKey}`
                );

                if (!playlistRes.ok) {
                    const errData = await playlistRes.json().catch(() => ({}));
                    throw new Error(errData?.error?.message || `Failed to fetch playlist items (Status ${playlistRes.status})`);
                }

                const playlistData = await playlistRes.json();
                if (!playlistData.items || playlistData.items.length === 0) {
                    throw new Error("No videos found in uploads playlist.");
                }

                // Extract video IDs
                const videoIds = playlistData.items
                    .map((item: any) => item.snippet?.resourceId?.videoId)
                    .filter(Boolean)
                    .join(',');

                if (!videoIds) {
                    throw new Error("No valid video IDs found in playlist.");
                }

                // 3. Get view counts for these videos
                const statsRes = await fetch(
                    `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,status&id=${videoIds}&key=${apiKey}`
                );

                if (!statsRes.ok) {
                    const errData = await statsRes.json().catch(() => ({}));
                    throw new Error(errData?.error?.message || `Failed to fetch video statistics (Status ${statsRes.status})`);
                }

                const statsData = await statsRes.json();
                if (!statsData.items || !Array.isArray(statsData.items)) {
                    throw new Error("Invalid response format for video statistics.");
                }

                // 4. Sort by view count descending and slice top 10
                const top10Videos = statsData.items
                    .filter((item: any) => item.status?.embeddable !== false)
                    .sort((a: any, b: any) => Number(b.statistics?.viewCount || 0) - Number(a.statistics?.viewCount || 0))
                    .slice(0, 10);

                if (isMounted) {
                    console.log("Top 10 Karaoke Videos Loaded:", top10Videos);
                    setData({ items: top10Videos });
                    setIsLoading(false);
                }
            } catch (err: any) {
                if (isMounted) {
                    console.error("Error fetching YouTube videos:", err.message);
                    setError(err.message || "An error occurred while fetching karaoke videos.");
                    setIsLoading(false);
                }
            }
        }

        fetchTopKaraokeVideos();

        return () => {
            isMounted = false;
        };
    }, []);

    return { data, isLoading, error };
}
