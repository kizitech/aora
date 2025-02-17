import { View, Text, TextInput, TouchableOpacity, Image } from "react-native";
import { icons } from "../constants";

const FormField = ({
  title,
  value,
  placeholder,
  handleChangeText,
  otherStyles,
  secureTextEntry,
  showPassword,
  setShowPassword,
  ...props
}) => {
  return (
    <View className={`space-y-2 ${otherStyles}`}>
      <Text className="text-base text-gray-600 dark:text-gray-100 font-pmedium mb-1">{title}</Text>

      <View className="flex flex-row items-center relative">
        <TextInput
          className="font-psemibold text-base text-black-200 dark:text-white flex-1 space-x-4 w-full h-16 px-4 bg-gray-200 dark:bg-black-100 rounded-2xl border-2 focus:border-secondary-100 dark:focus:border-secondary border-neutral-300 dark:border-black-200"
          value={value}
          placeholder={placeholder}
          placeholderTextColor="#7B7B8B"
          onChangeText={handleChangeText}
          secureTextEntry={secureTextEntry}
          {...props}
        />

        {title === "Password" && (
          <TouchableOpacity 
            onPress={() => setShowPassword(!showPassword)} 
            className="absolute right-5 bottom-4"
          >
            <Image
              source={!showPassword ? icons.eye : icons.eyeHide}
              className="w-8 h-8"
              resizeMode="contain"
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default FormField;