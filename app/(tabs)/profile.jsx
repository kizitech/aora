import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Image, FlatList, TouchableOpacity } from "react-native";

import { icons } from "../../constants";
import useAppwrite from "../../lib/useAppwrite";
import { getUserPosts } from "../../lib/appwrite"; // Removed signOut import
import { useGlobalContext } from "../../context/GlobalProvider";
import { EmptyState, InfoBox, VideoCard } from "../../components";
import { supabase } from "../../lib/supabase";

const Profile = () => {
    const { user, setUser, setIsLoggedIn } = useGlobalContext();
    const { data: posts } = useAppwrite(() => getUserPosts(user.$id));

    const logout = async () => {
        try {
            // Sign out from Supabase
            await supabase.auth.signOut();
            // Update local context state
            setUser(null);
            setIsLoggedIn(false);
            // Redirect to sign-in page
            router.replace("/sign-in");
        } catch (error) {
            console.error("Error signing out:", error);
            // Optionally handle error (e.g., show a notification)
        }
    };

    return (
        <SafeAreaView className="bg-gray-50 dark:bg-primary h-screen">
            <FlatList
                data={posts}
                keyExtractor={(item) => item.$id}
                renderItem={({ item }) => (
                    <VideoCard
                        title={item.title}
                        thumbnail={item.thumbnail}
                        video={item.video}
                        creator={item.creator.username}
                        avatar={item.creator.avatar}
                    />
                )}
                ListEmptyComponent={() => (
                    <EmptyState
                        route={"/create"}
                        title="No Videos Found"
                        subtitle="No videos found for this profile"
                    />
                )}
                ListHeaderComponent={() => (
                    <View className="w-full flex justify-center items-center mt-6 mb-12 px-4">
                        <View className="flex-row gap-4 items-center justify-end w-full mb-10">
                            <TouchableOpacity onPress={logout}>
                                <Image
                                    source={icons.logout}
                                    resizeMode="contain"
                                    className="w-6 h-6"
                                />
                            </TouchableOpacity>
                        </View>

                        <View className="w-16 h-16 border border-secondary rounded-lg flex justify-center items-center">
                            <Image
                                source={{ uri: user?.avatar }}
                                className="w-[90%] h-[90%] rounded-lg"
                                resizeMode="cover"
                            />
                        </View>

                        <InfoBox
                            title={user?.username}
                            containerStyles="mt-5"
                            titleStyles="text-lg"
                        />

                        <View className="mt-5 flex flex-row">
                            <InfoBox
                                title={posts.length || 0}
                                subtitle="Posts"
                                titleStyles="text-xl"
                                containerStyles="mr-10"
                            />
                            <InfoBox
                                title="4.4k"
                                subtitle="Followers"
                                titleStyles="text-xl"
                            />
                        </View>
                    </View>
                )}
            />
        </SafeAreaView>
    );
};

export default Profile;