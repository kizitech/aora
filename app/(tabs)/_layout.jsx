import { icons } from "../../constants";
import { Loader } from "../../components";
import { Image, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Redirect, Tabs } from "expo-router";
import { useGlobalContext } from "../../context/GlobalProvider";

const TabIcon = ({ icon, color }) => {
    return (
        <View className="flex items-center justify-center gap-2">
            <Image
                source={icon}
                resizeMode="contain"
                tintColor={color}
                className="w-6 h-6"
            />
        </View>
    );
};

const TabLayout = () => {
    const { isLoggedIn, isLoading } = useGlobalContext();

    if (isLoading) return <Loader isLoading={true} />;

    if (!isLoggedIn) return <Redirect href="/sign-in" />;

    return (
        <>
            <Tabs
                screenOptions={{
                    tabBarActiveTintColor: "#FFA001",
                    tabBarInactiveTintColor: "#CDCDE0",
                    tabBarShowLabel: true,
                    tabBarStyle: {
                        backgroundColor: "#161622",
                        borderTopWidth: 1,
                        borderTopColor: "#232533",
                        height: 86,
                    },
                }}
            >
                <Tabs.Screen
                    name="home"
                    options={{
                        title: "Home",
                        headerShown: false,
                        tabBarIcon: ({ color }) => (
                            <TabIcon icon={icons.home} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="create"
                    options={{
                        title: "Create",
                        headerShown: false,
                        tabBarIcon: ({ color }) => (
                            <TabIcon icon={icons.plus} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="favourites"
                    options={{
                        title: "Favourites",
                        headerShown: false,
                        tabBarIcon: ({ color }) => (
                            <TabIcon icon={icons.favourites} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="profile"
                    options={{
                        title: "Profile",
                        headerShown: false,
                        tabBarIcon: ({ color }) => (
                            <TabIcon icon={icons.profile} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="working-page"
                    options={{
                        title: "Account",
                        headerShown: false,
                        tabBarIcon: ({ color }) => (
                            <TabIcon icon={icons.profile} color={color} />
                        ),
                    }}
                />
            </Tabs>

            <StatusBar backgroundColor="#161622" style="auto" />
        </>
    );
};

export default TabLayout;