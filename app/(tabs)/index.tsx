import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, FlatList, ActivityIndicator, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { HeaderBar } from '../../components/HeaderBar';
import { SongCard } from '../../components/SongCard';
import { KARAOKE_SONGS, FEATURED_SONG, KaraokeSong } from '../../data/mockData';
import { useKaraokeStore } from '../../store/karaokeStore';
import { useGetKaraokeVideos } from '../../hooks/useGetKaraokeVideos';
import { useSearchYouTubeVideos } from '../../hooks/useSearchYouTubeVideos';

function formatYouTubeItem(item: any, index: number): KaraokeSong {
  const rawTitle = (item.snippet?.title || 'Unknown Song')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

  let title = rawTitle;
  let artist = item.snippet?.channelTitle || 'Sing King';
  if (rawTitle.includes(' - ')) {
    const parts = rawTitle.split(' - ');
    title = parts.slice(0, -1).join(' - ').trim();
    artist = parts[parts.length - 1].trim();
  }

  const coverUrl =
    item.snippet?.thumbnails?.high?.url ||
    item.snippet?.thumbnails?.medium?.url ||
    item.snippet?.thumbnails?.default?.url ||
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80';

  const videoId =
    (typeof item.id === 'string' && item.id) ||
    item.id?.videoId ||
    item.snippet?.resourceId?.videoId ||
    item.contentDetails?.videoId ||
    `yt-${index}`;

  const viewCountNum = Number(item.statistics?.viewCount);
  const playsCount = !isNaN(viewCountNum) && viewCountNum > 0
    ? viewCountNum >= 1000000
      ? `${(viewCountNum / 1000000).toFixed(1)}M`
      : `${(viewCountNum / 1000).toFixed(1)}K`
    : `${Math.floor(15 + ((index * 7) % 80))}K`;

  return {
    id: videoId,
    title,
    artist,
    coverUrl,
    duration: '3:45',
    playsCount,
  };
}

export default function SongDiscoveryScreen() {
  const { data: topData, isLoading: isTopLoading, error: topError } = useGetKaraokeVideos();
  const { data: searchData, isLoading: isSearchLoading, error: searchError, search } = useSearchYouTubeVideos();

  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState('');
  const setActiveSong = useKaraokeStore((s) => s.setActiveSong);

  const handleSingNow = (song: KaraokeSong) => {
    setActiveSong(song);
    router.push('/singing' as any);
  };

  const handleTriggerSearch = () => {
    const trimmed = searchQuery.trim();
    if (trimmed) {
      setActiveSearchTerm(trimmed);
      search(trimmed);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setActiveSearchTerm('');
    search('');
  };

  // Top Karaoke Songs from YouTube or Mock fallback
  const topSongsList = useMemo<KaraokeSong[]>(() => {
    if (!topData?.items || !Array.isArray(topData.items) || topData.items.length === 0) {
      return KARAOKE_SONGS as KaraokeSong[];
    }
    return topData.items.map((item: any, index: number) => formatYouTubeItem(item, index));
  }, [topData]);

  // YouTube Search Results
  const searchSongsList = useMemo<KaraokeSong[] | null>(() => {
    if (!activeSearchTerm || !searchData?.items || !Array.isArray(searchData.items)) {
      return null;
    }
    return searchData.items.map((item: any, index: number) => formatYouTubeItem(item, index));
  }, [activeSearchTerm, searchData]);

  // Displayed Songs selection
  const displayedSongs = useMemo(() => {
    if (searchSongsList !== null) {
      return searchSongsList;
    }
    return topSongsList;
  }, [searchSongsList, topSongsList]);

  const featuredSong = displayedSongs.length > 0 ? displayedSongs[0] : FEATURED_SONG;

  const isSearching = isSearchLoading;
  const isInitialLoading = isTopLoading && !activeSearchTerm;
  const currentError = activeSearchTerm ? searchError : topError;

  return (
    <View className="flex-1 bg-surface">
      <HeaderBar title="OPEN KARAOKE" />

      {/* Main Container */}
      <View className="flex-1 px-4 pt-3">
        {/* Search Bar */}
        <View className="flex-row items-center bg-surface-container border border-white/10 rounded-full px-4 py-2.5 mb-4">
          <Pressable onPress={handleTriggerSearch} hitSlop={8}>
            <Ionicons name="search" size={18} color="#00eefc" style={{ marginRight: 8 }} />
          </Pressable>
          <TextInput
            placeholder="Search song or artist..."
            placeholderTextColor="#888"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            onSubmitEditing={handleTriggerSearch}
            className="flex-1 text-white font-medium text-sm"
          />
          {searchQuery.length > 0 && (
            <Ionicons name="close-circle" size={18} color="#aaa" onPress={handleClearSearch} />
          )}
        </View>

        {/* Status Messages */}
        {(isInitialLoading || isSearching) && (
          <View className="items-center justify-center py-6">
            <ActivityIndicator size="large" color="#00eefc" />
            <Text className="text-gray-400 text-xs font-mono mt-2">
              {isSearching ? `SEARCHING YOUTUBE FOR "${activeSearchTerm.toUpperCase()}"...` : 'FETCHING LATEST KARAOKE TRACKS...'}
            </Text>
          </View>
        )}

        {currentError && !isSearching && (
          <View className="bg-tertiary/20 border border-tertiary/40 rounded-xl p-3 mb-3 flex-row items-center">
            <Ionicons name="warning-outline" size={18} color="#e7006e" style={{ marginRight: 8 }} />
            <Text className="text-xs text-tertiary flex-1 font-mono">
              Notice: {currentError}.
            </Text>
          </View>
        )}

        {/* Songs Virtualized List */}
        <FlatList
          data={displayedSongs}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            !activeSearchTerm ? (
              <View>
                <Text className="text-gray-400 text-xs font-mono font-bold uppercase tracking-wider mb-2">
                  Popular Songs
                </Text>
                <SongCard song={featuredSong} onSingNow={handleSingNow} isFeatured />
              </View>
            ) : (
              <Text className="text-gray-400 text-xs font-mono font-bold uppercase tracking-wider mb-3">
                {activeSearchTerm ? `YOUTUBE SEARCH RESULTS FOR "${activeSearchTerm.toUpperCase()}" (${displayedSongs.length})` : `MATCHING SONGS (${displayedSongs.length})`}
              </Text>
            )
          }
          renderItem={({ item }) => <SongCard song={item} onSingNow={handleSingNow} />}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      </View>
    </View>
  );
}
