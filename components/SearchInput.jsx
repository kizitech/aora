import { useState } from "react";
import { router, usePathname } from "expo-router";
import { View, TouchableOpacity, Image, TextInput, Alert } from "react-native";

import { icons } from "../constants";
import { colorScheme } from "nativewind";
import Fontisto from '@expo/vector-icons/Fontisto';

const SearchInput = ({ initialQuery }) => {
  const pathname = usePathname();
  const [query, setQuery] = useState(initialQuery || "");

  return (
    <View className="relative">
      <TextInput
        className="text-base mt-0.5 text-black-200 dark:text-white flex-1 font-psemibold flex flex-row items-center space-x-4 w-full h-16 px-4 bg-gray-200 dark:bg-black-100 rounded-2xl border-2 focus:border-secondary border-neutral-300 dark:border-black-200"
        value={query}
        placeholder="Search a video topic"
        placeholderTextColor="#7B7B8B"
        onChangeText={(e) => setQuery(e)}
      />

      <TouchableOpacity
        onPress={() => {
          if (query === "")
            return Alert.alert(
              "Missing Query",
              "Please input something to search results across database"
            );

          if (pathname.startsWith("/search")) router.setParams({ query });
          else router.push(`/search/${query}`);
        }}
      >
        <Fontisto name="search" color="#7B7B8B" size={16} className="absolute right-5 bottom-6" />
      </TouchableOpacity>
    </View>
  );
};

export default SearchInput;
