import { useState, useCallback } from "react";

export function useSearchYouTubeVideos(maxResults: number = 25) {
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const search = useCallback(async (searchQuery: string) => {
        const baseQuery = searchQuery.trim();
        if (!baseQuery) {
            setData(null);
            setIsLoading(false);
            setError(null);
            return;
        }

        const trimmedQuery = `${baseQuery} karaoke`;
        try {
            setIsLoading(true);
            setError(null);

            const apiKey = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;
            if (!apiKey) {
                throw new Error("Missing YouTube API Key (EXPO_PUBLIC_YOUTUBE_API_KEY).");
            }

            // 1. Search YouTube videos using the YouTube v3 search endpoint
            const searchRes = await fetch(
                `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&q=${encodeURIComponent(trimmedQuery)}&maxResults=${maxResults}&key=${apiKey}`
            );

            if (!searchRes.ok) {
                const errData = await searchRes.json().catch(() => ({}));
                throw new Error(errData?.error?.message || `Failed to search YouTube videos (Status ${searchRes.status})`);
            }

            const searchData = await searchRes.json();
            if (!searchData.items || !Array.isArray(searchData.items) || searchData.items.length === 0) {
                setData({ items: [] });
                setIsLoading(false);
                return;
            }

            // Extract video IDs from search results
            const videoIds = searchData.items
                .map((item: any) => item.id?.videoId)
                .filter(Boolean)
                .join(',');

            if (!videoIds) {
                setData({ items: [] });
                setIsLoading(false);
                return;
            }

            // 2. Fetch video snippet & statistics for view counts and full video details
            const statsRes = await fetch(
                `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,status&id=${videoIds}&key=${apiKey}`
            );

            if (!statsRes.ok) {
                // Fallback to raw search items if video stats fetch fails
                console.warn("Failed to fetch video statistics, using raw search items.");
                setData({ items: searchData.items });
                setIsLoading(false);
                return;
            }

            const statsData = await statsRes.json();
            const embeddableItems = (statsData.items || []).filter(
                (item: any) => item.status?.embeddable !== false
            );
            console.log(`YouTube Search results for "${trimmedQuery}":`, embeddableItems);
            setData({ items: embeddableItems });
            setIsLoading(false);
        } catch (err: any) {
            console.error("Error searching YouTube videos:", err.message);
            setError(err.message || "An error occurred while searching YouTube videos.");
            setIsLoading(false);
        }
    }, [maxResults]);

    return { data, isLoading, error, search };
}
