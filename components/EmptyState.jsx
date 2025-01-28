import { router } from "expo-router";
import { View, Text, Image } from "react-native";

import { images } from "../constants";
import CustomButton from "./CustomButton";
import { useColorScheme } from "nativewind";

const EmptyState = ({ title, subtitle, btnText, route }) => {
  const { colorScheme } = useColorScheme();

  return (
    <View className="flex justify-center items-center px-4">
      <Image
        source={colorScheme === "dark" ? images.emptyDark : images.emptyLight}
        resizeMode="cover"
        className="w-52 h-[180px] block"
      />

      <Text className="text-xl text-center font-psemibold text-primary dark:text-white mb-2">
        {title}
      </Text>
      <Text className="text-sm font-pmedium text-gray-600 dark:text-gray-100">{subtitle}</Text>

      <CustomButton
        title={btnText || "Create a Video"}
        handlePress={() => router.push(route)}
        containerStyles="w-full my-10"
      />
    </View>
  );
};

export default EmptyState;
