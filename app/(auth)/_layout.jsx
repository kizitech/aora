import { Redirect, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { Loader } from "../../components";
import { useGlobalContext } from "../../context/GlobalProvider";

const AuthLayout = () => {
  const { loading, isLogged } = useGlobalContext();

  if (!loading && isLogged) return <Redirect href="/home" />;

  return (
    <>
      <Stack>
        <Stack.Screen
          name="sign-in"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="sign-up"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="test"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="working-page"
          options={{
            headerShown: false,
          }}
        />
      </Stack>

      <Loader isLoading={loading} />
      <StatusBar backgroundColor="#161622" style="auto" />
    </>
  );
};

export default AuthLayout;
