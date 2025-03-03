import React from 'react'
import { ScrollView, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const Favourites = () => {
  return (
    <SafeAreaView className="bg-gray-50 dark:bg-primary h-full">
      <ScrollView className="px-4 mt-6">
        <Text className="text-2xl text-primary dark:text-white font-psemibold">Favourites</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

export default Favourites