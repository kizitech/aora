import { useState } from "react";
import { Link, useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, ScrollView, Dimensions, Alert, Image } from "react-native";
import { db } from "../../lib/firebaseConfig"; // Adjust the path as necessary
import { collection, query, where, getDocs } from "firebase/firestore"; // Import Firestore functions
import { useGlobalContext } from "../../context/GlobalProvider"; // Import the global context

import { images } from "../../constants";
import { CustomButton, FormField } from "../../components";

const SignIn = () => {
  const { colorScheme } = useColorScheme();
  const router = useRouter();
  const { setIsLoggedIn, setUser, setIsLoading } = useGlobalContext(); // Get context functions

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const submit = async () => {
    if (!form.email || !form.password) {
      Alert.alert("Please fill in both email and password fields.");
      return; // Prevent submission if fields are empty
    }

    setIsSubmitting(true);
    setIsLoading(true);
    try {
      const userQuery = query(
        collection(db, "users"),
        where("email", "==", form.email),
        where("password", "==", form.password) 
      );

      const querySnapshot = await getDocs(userQuery);

      if (querySnapshot.empty) {
        Alert.alert("Invalid credentials. Please try again.");
        setIsLoggedIn(false); // Ensure logged-in state is false on failure
      } else {
        const userData = querySnapshot.docs[0].data(); // Get user data
        setUser(userData); // Set user data in context
        setIsLoggedIn(true); // Set logged-in state
        Alert.alert("Login successful!");
        router.push("/home"); // Navigate to the home page
      }
    } catch (error) {
      Alert.alert("Error signing in:", error.message);
    } finally {
      setIsSubmitting(false);
      setIsLoading(false); // Reset loading state
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
            Log in to Aora
          </Text>

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
            title="Sign In"
            handlePress={submit}
            containerStyles="mt-7"
            isLoading={isSubmitting}
          />

          <View className="flex justify-center pt-5 flex-row gap-2">
            <Text className="text-lg text-gray-600 dark:text-gray-100 font-pregular">
              Don't have an account?
            </Text>
            <Link
              href="/sign-up"
              className="text-lg font-psemibold text-secondary"
            >
              Signup
            </Link>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SignIn;