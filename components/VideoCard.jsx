import { useState } from "react";
import { VideoView, useVideoPlayer } from "expo-video"; // Import from expo-video
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { icons } from "../constants";

const VideoCard = ({ title, creator, avatar, thumbnail, video }) => {
  const [play, setPlay] = useState(false);
  const player = useVideoPlayer(video, (player) => {
    player.loop = false; // Set loop as needed
  });

  return (
    <View className="flex flex-col items-center px-4 mb-14">
      <View className="flex flex-row gap-3 items-start">
        <View className="flex justify-center items-center flex-row flex-1">
          <View className="w-[46px] h-[46px] rounded-lg border border-secondary flex justify-center items-center p-0.5">
            <Image
              source={{ uri: avatar }}
              className="w-full h-full rounded-lg"
              resizeMode="cover"
            />
          </View>

          <View className="flex justify-center flex-1 ml-3 gap-y-1">
            <Text
              className="font-psemibold text-sm text-white"
              numberOfLines={1}
            >
              {title}
            </Text>
            <Text
              className="text-xs text-gray-100 font-pregular"
              numberOfLines={1}
            >
              {creator}
            </Text>
          </View>
        </View>

        <View className="pt-2">
          <Image source={icons.menu} className="w-5 h-5" resizeMode="contain" />
        </View>
      </View>

      {play ? (
        <VideoView
          player={player}
          style={styles.video}
          className="w-full h-60 rounded-xl mt-3"
          allowsFullscreen
          allowsPictureInPicture
          nativeControls
          onPlaybackStatusUpdate={(status) => {
            if (status.isPlaying === false) {
              setPlay(false);
            }
          }}
        />
      ) : (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            setPlay(true);
            player.play();
          }}
          className="w-full h-60 rounded-xl mt-3 relative flex justify-center items-center"
        >
          <Image
            source={{ uri: thumbnail }}
            className="w-full h-full rounded-xl mt-3"
            resizeMode="cover"
          />

          <Image
            source={icons.play}
            className="w-12 h-12 absolute"
            resizeMode="contain"
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default VideoCard;

const styles = StyleSheet.create({
  video: {
    width: '100%',
    height: 275,
    borderRadius: 16,
    marginTop: 12
  },
});