import { StatusBar } from "expo-status-bar";
import { Redirect, Tabs } from "expo-router";
import { Image, Text, View } from "react-native";

import { icons } from "../../constants";
import { Loader } from "../../components";
import { useGlobalContext } from "../../context/GlobalProvider";

const TabIcon = ({ icon, color, name, focused }) => {
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
    const { loading, isLoggedIn } = useGlobalContext();

    if (!loading && !isLoggedIn) return <Redirect href="/sign-in" />;

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
                        height: 80,
                    },
                }}
            >
                <Tabs.Screen
                    name="home"
                    options={{
                        title: "Home",
                        headerShown: false,
                        tabBarIcon: ({ color, focused }) => (
                            <TabIcon
                                icon={icons.home}
                                color={color}
                                name="Home"
                                focused={focused}
                            />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="favourites"
                    options={{
                        title: "Favourites",
                        headerShown: false,
                        tabBarIcon: ({ color, focused }) => (
                            <TabIcon
                                icon={icons.favourites}
                                color={color}
                                name="Favorites"
                                focused={focused}
                            />
                        ),
                    }}
                />

                <Tabs.Screen
                    name="create"
                    options={{
                        title: "Create",
                        headerShown: false,
                        tabBarIcon: ({ color, focused }) => (
                            <TabIcon
                                icon={icons.plus}
                                color={color}
                                name="Create"
                                focused={focused}
                            />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="profile"
                    options={{
                        title: "Profile",
                        headerShown: false,
                        tabBarIcon: ({ color, focused }) => (
                            <TabIcon
                                icon={icons.profile}
                                color={color}
                                name="Profile"
                                focused={focused}
                            />
                        ),
                    }}
                />
            </Tabs>

            <Loader isLoading={loading} />
            <StatusBar backgroundColor="#161622" style="light" />
        </>
    );
};

export default TabLayout;
