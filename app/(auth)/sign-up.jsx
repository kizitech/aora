import { useState } from "react";
import { Link, useRouter } from "expo-router"; // Import useRouter for navigation
import { useColorScheme } from "nativewind";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, ScrollView, Dimensions, Alert, Image } from "react-native";
import { db } from "../../lib/firebaseConfig"; 
import { collection, addDoc } from "firebase/firestore";

import { images } from "../../constants";
import { CustomButton, FormField } from "../../components";

const SignUp = () => {
  const { colorScheme } = useColorScheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
  });

  const router = useRouter(); // Initialize router for navigation

  const submit = async () => {
    // Validation: Check if all fields are filled
    if (!form.username || !form.email || !form.password) {
      Alert.alert("Please fill in all fields.");
      return; // Prevent submission if any field is empty
    }

    setIsSubmitting(true);
    try {
      const docRef = await addDoc(collection(db, "users"), {
        username: form.username,
        email: form.email,
        password: form.password, 
      });
      Alert.alert("Signup successful!", `User ID: ${docRef.id}`);

      router.push("/sign-in");
      
      setForm({ username: "", email: "", password: "" });
    } catch (error) {
      Alert.alert("Error signing up:", error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="bg-gray-50 dark:bg-primary h-full">
      <ScrollView>
        <View
          className="w-full flex justify-center h-full px-4 my-6"
          style={{
            minHeight: Dimensions.get("window").height - 100,
          }}
        >
          <Image
            source={colorScheme === "dark" ? images.logoDark : images.logoLight}
            resizeMode="contain"
            className="w-[115px] h-[34px]"
          />

          <Text className="text-2xl font-semibold text-primary dark:text-white mt-10 font-psemibold">
            Sign Up to Aora
          </Text>

          <FormField
            title="Username"
            value={form.username}
            handleChangeText={(e) => setForm({ ...form, username: e })}
            otherStyles="mt-10"
          />

          <FormField
            title="Email"
            value={form.email}
            handleChangeText={(e) => setForm({ ...form, email: e })}
            otherStyles="mt-7"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <FormField
            title="Password"
            value={form.password}
            handleChangeText={(e) => setForm({ ...form, password: e })}
            otherStyles="mt-7"
            secureTextEntry
          />

          <CustomButton
            title="Sign Up"
            handlePress={submit}
            containerStyles="mt-7"
            isLoading={isSubmitting}
          />

          <View className="flex justify-center pt-5 flex-row gap-2">
            <Text className="text-lg text-gray-600 dark:text-gray-100 font-pregular">
              Have an account already?
            </Text>
            <Link
              href="/sign-in"
              className="text-lg font-psemibold text-secondary"
            >
              Login
            </Link>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SignUp;