import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { HeaderBar } from '../../components/HeaderBar';
import { SongCard } from '../../components/SongCard';
import { KARAOKE_SONGS, FEATURED_SONG, KaraokeSong } from '../../data/mockData';
import { useKaraokeStore } from '../../store/karaokeStore';
import { useGetKaraokeVideos } from '../../hooks/useGetKaraokeVideos';

export default function SongDiscoveryScreen() {
  const { data, isLoading, error } = useGetKaraokeVideos();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const setActiveSong = useKaraokeStore((s) => s.setActiveSong);

  const handleSingNow = (song: KaraokeSong) => {
    setActiveSong(song);
    router.push('/singing' as any);
  };

  const songsList = useMemo<KaraokeSong[]>(() => {
    if (!data?.items || !Array.isArray(data.items) || data.items.length === 0) {
      return KARAOKE_SONGS as KaraokeSong[];
    }

    return data.items.map((item: any, index: number) => {
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
        artist = parts.slice(1).join(' - ').trim();
        title = parts[0].trim();
      }

      const coverUrl =
        item.snippet?.thumbnails?.high?.url ||
        item.snippet?.thumbnails?.medium?.url ||
        item.snippet?.thumbnails?.default?.url ||
        'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80';

      const videoId = typeof item.id === 'string' ? item.id : item.id?.videoId || `yt-${index}`;

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
    });
  }, [data]);

  const filteredSongs = useMemo(() => {
    return songsList.filter((song) => {
      return (
        song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        song.artist.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [songsList, searchQuery]);

  const featuredSong = filteredSongs.length > 0 ? filteredSongs[0] : FEATURED_SONG;

  return (
    <View className="flex-1 bg-surface">
      <HeaderBar title="OPEN KARAOKE" />

      {/* Main Container */}
      <View className="flex-1 px-4 pt-3">
        {/* Search Bar */}
        <View className="flex-row items-center bg-surface-container border border-white/10 rounded-full px-4 py-2.5 mb-4">
          <Ionicons name="search" size={18} color="#00eefc" style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search song or artist..."
            placeholderTextColor="#888"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 text-white font-medium text-sm"
          />
          {searchQuery.length > 0 && (
            <Ionicons name="close-circle" size={18} color="#aaa" onPress={() => setSearchQuery('')} />
          )}
        </View>

        {/* Status Messages */}
        {isLoading && (
          <View className="items-center justify-center py-6">
            <ActivityIndicator size="large" color="#00eefc" />
            <Text className="text-gray-400 text-xs font-mono mt-2">FETCHING LATEST KARAOKE TRACKS...</Text>
          </View>
        )}

        {error && (
          <View className="bg-tertiary/20 border border-tertiary/40 rounded-xl p-3 mb-3 flex-row items-center">
            <Ionicons name="warning-outline" size={18} color="#e7006e" style={{ marginRight: 8 }} />
            <Text className="text-xs text-tertiary flex-1 font-mono">
              YouTube Feed Notice: {error}. Showing offline catalog.
            </Text>
          </View>
        )}

        {/* Songs Virtualized List */}
        <FlatList
          data={filteredSongs}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            !searchQuery ? (
              <View>
                <Text className="text-gray-400 text-xs font-mono font-bold uppercase tracking-wider mb-2">
                  Popular Songs
                </Text>
                <SongCard song={featuredSong} onSingNow={handleSingNow} isFeatured />
              </View>
            ) : (
              <Text className="text-gray-400 text-xs font-mono font-bold uppercase tracking-wider mb-3">
                SEARCH RESULTS ({filteredSongs.length})
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
