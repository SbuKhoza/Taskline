import { View, Image } from "react-native"
import React, { useEffect } from "react"

const Splash = ({ onFinish }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onFinish) onFinish()
    }, 3000) // 3 seconds

    return () => clearTimeout(timer)
  }, [onFinish])

  return (
    <View className="flex-1 items-center justify-center bg-[#fcffef]">
      <Image source={require("../assets/logo.png")} className="size-52" resizeMode="contain" />
    </View>
  )
}

export default Splash